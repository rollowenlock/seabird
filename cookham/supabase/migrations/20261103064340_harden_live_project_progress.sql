-- Store only the documented public projection even if a caller sends extra keys.
CREATE OR REPLACE FUNCTION seabird.update_project_progress(project_id text, expected_revision bigint, progress jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p seabird.proposals;
  accepted_version integer;
  current_progress seabird.project_progress;
  safe_progress jsonb;
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
    OR jsonb_typeof(progress->'events') IS DISTINCT FROM 'array'
    OR jsonb_array_length(progress->'stages') > 20
    OR jsonb_array_length(progress->'deliverables') > 30
    OR jsonb_array_length(progress->'payments') > 20
    OR jsonb_array_length(progress->'events') > 500 THEN
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
  safe_progress := jsonb_build_object(
    'baselineVersion', accepted_version,
    'lifecycle', progress->'lifecycle',
    'completedOn', progress->'completedOn',
    'stages', progress->'stages',
    'deliverables', progress->'deliverables',
    'payments', progress->'payments',
    'events', progress->'events'
  );
  INSERT INTO seabird.project_progress(proposal_id, baseline_version, progress)
    VALUES (p.id, accepted_version, safe_progress)
  ON CONFLICT (proposal_id) DO UPDATE SET
    baseline_version = EXCLUDED.baseline_version,
    progress = EXCLUDED.progress,
    revision = seabird.project_progress.revision + 1,
    updated_at = now()
  RETURNING * INTO current_progress;
  RETURN jsonb_build_object('revision', current_progress.revision, 'baseline_version', current_progress.baseline_version, 'updated_at', current_progress.updated_at);
END;
$$;

REVOKE ALL ON FUNCTION seabird.update_project_progress(text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION seabird.update_project_progress(text,bigint,jsonb) TO authenticated;
