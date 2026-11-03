-- A mutable, client-safe projection sits beside immutable proposal versions.
-- Public reads remain capability-token RPCs; tables are never exposed directly.
CREATE TABLE seabird.project_progress (
  proposal_id uuid PRIMARY KEY REFERENCES seabird.proposals(id) ON DELETE CASCADE,
  baseline_version integer NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  progress jsonb NOT NULL CHECK (
    jsonb_typeof(progress) = 'object'
    AND octet_length(progress::text) < 150000
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (proposal_id, baseline_version)
    REFERENCES seabird.proposal_versions(proposal_id, version)
);

ALTER TABLE seabird.project_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON seabird.project_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON seabird.project_progress TO authenticated;
CREATE POLICY owner_read ON seabird.project_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM seabird.proposals p
    WHERE p.id = proposal_id AND p.user_id = (SELECT auth.uid())
  ));

CREATE FUNCTION seabird.update_project_progress(project_id text, expected_revision bigint, progress jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p seabird.proposals;
  accepted_version integer;
  current_progress seabird.project_progress;
BEGIN
  IF auth.uid() IS NULL
    OR coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'false'
    OR auth.jwt()->'app_metadata'->>'cookham_backend_app' IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM seabird.profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sign in to Seabird first.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(progress) IS DISTINCT FROM 'object'
    OR octet_length(progress::text) >= 150000
    OR coalesce(progress->>'lifecycle', '') NOT IN ('draft', 'active', 'completed')
    OR jsonb_typeof(progress->'stages') IS DISTINCT FROM 'array'
    OR jsonb_typeof(progress->'deliverables') IS DISTINCT FROM 'array'
    OR jsonb_typeof(progress->'payments') IS DISTINCT FROM 'array'
    OR jsonb_typeof(progress->'events') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid project progress.';
  END IF;
  SELECT * INTO p FROM seabird.proposals
    WHERE user_id = auth.uid() AND proposals.project_id = update_project_progress.project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publish and accept the project before sharing progress.'; END IF;
  SELECT max(version) INTO accepted_version FROM seabird.acceptances WHERE proposal_id = p.id;
  IF accepted_version IS NULL THEN RAISE EXCEPTION 'The client must accept a version before progress is shared.'; END IF;
  SELECT * INTO current_progress FROM seabird.project_progress WHERE proposal_id = p.id FOR UPDATE;
  IF FOUND AND expected_revision IS DISTINCT FROM current_progress.revision THEN
    RAISE EXCEPTION 'Project progress changed elsewhere. Refresh and retry.' USING ERRCODE = '40001';
  END IF;
  IF NOT FOUND AND expected_revision IS NOT NULL THEN
    RAISE EXCEPTION 'Project progress changed elsewhere. Refresh and retry.' USING ERRCODE = '40001';
  END IF;
  INSERT INTO seabird.project_progress(proposal_id, baseline_version, progress)
    VALUES (p.id, accepted_version, progress || jsonb_build_object('baselineVersion', accepted_version))
  ON CONFLICT (proposal_id) DO UPDATE SET
    baseline_version = EXCLUDED.baseline_version,
    progress = EXCLUDED.progress,
    revision = seabird.project_progress.revision + 1,
    updated_at = now()
  RETURNING * INTO current_progress;
  RETURN jsonb_build_object('revision', current_progress.revision, 'baseline_version', current_progress.baseline_version, 'updated_at', current_progress.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION seabird.read_proposal(link_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH selected AS (
    SELECT p.*, (SELECT max(a.version) FROM seabird.acceptances a WHERE a.proposal_id = p.id) AS accepted_version
    FROM seabird.proposals p WHERE p.token = link_token AND NOT p.revoked
  ), baseline AS (
    SELECT s.*, coalesce(s.accepted_version, s.version) AS baseline_version FROM selected s
  )
  SELECT jsonb_build_object(
    'project', base.project,
    'version', b.baseline_version,
    'published_at', base.published_at,
    'accepted_at', accepted.accepted_at,
    'latest_version', b.version,
    'pending', CASE WHEN b.accepted_version IS NOT NULL AND b.version > b.accepted_version
      THEN jsonb_build_object('project', latest.project, 'version', latest.version, 'published_at', latest.published_at)
      ELSE NULL END,
    'progress', CASE WHEN pr.baseline_version = b.accepted_version THEN pr.progress ELSE NULL END,
    'progress_revision', pr.revision,
    'progress_updated_at', pr.updated_at
  )
  FROM baseline b
  JOIN seabird.proposal_versions base ON base.proposal_id = b.id AND base.version = b.baseline_version
  JOIN seabird.proposal_versions latest ON latest.proposal_id = b.id AND latest.version = b.version
  LEFT JOIN seabird.acceptances accepted ON accepted.proposal_id = b.id AND accepted.version = b.accepted_version
  LEFT JOIN seabird.project_progress pr ON pr.proposal_id = b.id;
$$;

-- Acceptance advances the progress baseline while keeping factual history.
CREATE OR REPLACE FUNCTION seabird.accept_proposal(link_token uuid, expected_version integer, client_name text, client_email text, agreed boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p seabird.proposals; a seabird.acceptances; snapshot jsonb; initial_progress jsonb;
BEGIN
  IF agreed IS DISTINCT FROM true OR coalesce(length(trim(client_name)),0) NOT BETWEEN 1 AND 200
    OR coalesce(length(trim(client_email)),0) NOT BETWEEN 3 AND 254
    OR trim(client_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter your name, email and agreement to continue.';
  END IF;
  SELECT * INTO p FROM seabird.proposals WHERE token = link_token AND NOT revoked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This link is unavailable.'; END IF;
  IF p.version IS DISTINCT FROM expected_version THEN
    RAISE EXCEPTION 'The proposal changed. Reload and review the latest version before accepting.' USING ERRCODE = '40001';
  END IF;
  INSERT INTO seabird.acceptances(proposal_id,version,name,email)
    VALUES(p.id,p.version,trim(client_name),lower(trim(client_email))) ON CONFLICT DO NOTHING;
  SELECT * INTO a FROM seabird.acceptances WHERE proposal_id = p.id AND version = p.version;
  SELECT project INTO snapshot FROM seabird.proposal_versions WHERE proposal_id = p.id AND version = p.version;
  initial_progress := jsonb_build_object(
    'baselineVersion', p.version,
    'lifecycle', 'active',
    'completedOn', null,
    'stages', coalesce((SELECT jsonb_agg(jsonb_build_object('key', item->>'key', 'status', 'incomplete', 'completedOn', null)) FROM jsonb_array_elements(snapshot->'stagePlan') item), '[]'::jsonb),
    'deliverables', coalesce((SELECT jsonb_agg(jsonb_build_object('id', item->>'id', 'status', 'planned', 'statusOn', null)) FROM jsonb_array_elements(snapshot->'deliverableItems') item), '[]'::jsonb),
    'payments', coalesce((SELECT jsonb_agg(jsonb_build_object('id', item->>'id', 'status', 'planned', 'statusOn', null)) FROM jsonb_array_elements(snapshot->'paymentMilestones') item), '[]'::jsonb),
    'events', '[]'::jsonb
  );
  INSERT INTO seabird.project_progress(proposal_id, baseline_version, progress)
    VALUES(p.id, p.version, initial_progress)
  ON CONFLICT (proposal_id) DO UPDATE SET baseline_version = p.version, revision = seabird.project_progress.revision + 1,
    progress = seabird.project_progress.progress || jsonb_build_object('baselineVersion', p.version), updated_at = now();
  RETURN jsonb_build_object('version',a.version,'accepted_at',a.accepted_at);
END;
$$;

REVOKE ALL ON FUNCTION seabird.update_project_progress(text,bigint,jsonb),seabird.read_proposal(uuid),seabird.accept_proposal(uuid,integer,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION seabird.update_project_progress(text,bigint,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION seabird.read_proposal(uuid),seabird.accept_proposal(uuid,integer,text,text,boolean) TO anon,authenticated;

-- Publish stable deliverable and payment IDs so live status can follow accepted versions.
CREATE OR REPLACE FUNCTION seabird.publish_proposal(project_id text, project jsonb, expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p seabird.proposals; safe jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false') <> 'false'
    OR auth.jwt()->'app_metadata'->>'cookham_backend_app' IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM seabird.profiles WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sign in to Seabird first.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(project) IS DISTINCT FROM 'object' OR octet_length(project::text)>150000
    OR coalesce(length(project->>'title'),0)=0 OR coalesce(length(project->>'client'),0)=0
    OR jsonb_typeof(project->'deliverableItems') IS DISTINCT FROM 'array'
    OR jsonb_typeof(project->'paymentMilestones') IS DISTINCT FROM 'array'
    OR jsonb_typeof(project->'stagePlan') IS DISTINCT FROM 'array'
    OR jsonb_array_length(project->'deliverableItems') NOT BETWEEN 1 AND 30
    OR jsonb_array_length(project->'paymentMilestones') NOT BETWEEN 1 AND 20
    OR jsonb_array_length(project->'stagePlan') NOT BETWEEN 2 AND 20
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(project->'deliverableItems') item
      WHERE coalesce(length(item->>'id'),0) NOT BETWEEN 1 AND 100 OR coalesce(length(item->>'name'),0) NOT BETWEEN 1 AND 200)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(project->'paymentMilestones') item
      WHERE coalesce(length(item->>'id'),0) NOT BETWEEN 1 AND 100 OR coalesce(length(item->>'label'),0) NOT BETWEEN 1 AND 200
        OR coalesce(item->>'dueOn','') !~ '^\d{4}-\d{2}-\d{2}$')
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(project->'stagePlan') stage
      WHERE coalesce(length(stage->>'key'),0) NOT BETWEEN 1 AND 64 OR coalesce(stage->>'key','') !~ '^[a-z0-9-]+$'
        OR coalesce(length(stage->>'name'),0) NOT BETWEEN 1 AND 100 OR coalesce(length(stage->>'owner'),0) NOT BETWEEN 1 AND 200
        OR coalesce(stage->>'start','') !~ '^\d{4}-\d{2}-\d{2}$' OR coalesce(stage->>'end','') !~ '^\d{4}-\d{2}-\d{2}$'
        OR coalesce(stage->>'start','') > coalesce(stage->>'end','')) THEN
    RAISE EXCEPTION 'Invalid proposal.';
  END IF;
  SELECT jsonb_object_agg(key,value) INTO safe FROM jsonb_each(project)
    WHERE key=ANY(ARRAY['id','title','client','description','deliverables','deliverableItems','paymentMilestones','currency','tax','fee','deposit','start','conceptDays','animationDays','makingStageName','reviewDays','reviews','finishDays','inputs','terms','paymentNote','rights','changesPolicy','provider','stagePlan']);
  INSERT INTO seabird.proposals(user_id,project_id) VALUES(auth.uid(),publish_proposal.project_id)
    ON CONFLICT ON CONSTRAINT proposals_user_id_project_id_key DO NOTHING;
  SELECT * INTO p FROM seabird.proposals WHERE user_id=auth.uid() AND proposals.project_id=publish_proposal.project_id FOR UPDATE;
  IF expected_version IS DISTINCT FROM p.version THEN
    RAISE EXCEPTION 'Published version changed. Reopen sharing and review before publishing.' USING ERRCODE='40001';
  END IF;
  IF p.revoked THEN RAISE EXCEPTION 'This link was revoked. Create a new link before publishing.'; END IF;
  IF EXISTS(SELECT 1 FROM seabird.proposal_versions v WHERE v.proposal_id=p.id AND v.version=p.version AND v.project=safe) THEN
    RETURN jsonb_build_object('token',p.token,'version',p.version);
  END IF;
  UPDATE seabird.proposals SET version=version+1 WHERE id=p.id RETURNING * INTO p;
  INSERT INTO seabird.proposal_versions(proposal_id,version,project) VALUES(p.id,p.version,safe);
  RETURN jsonb_build_object('token',p.token,'version',p.version);
END;
$$;
REVOKE ALL ON FUNCTION seabird.publish_proposal(text,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION seabird.publish_proposal(text,jsonb,integer) TO authenticated;
