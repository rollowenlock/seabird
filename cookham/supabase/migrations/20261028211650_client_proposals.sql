-- Immutable published versions; anonymous access is only through a random link token.
CREATE TABLE seabird.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES seabird.profiles(user_id) ON DELETE CASCADE,
  project_id text NOT NULL CHECK (length(project_id) BETWEEN 1 AND 200),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, project_id)
);
CREATE TABLE seabird.proposal_versions (
  proposal_id uuid NOT NULL REFERENCES seabird.proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  project jsonb NOT NULL CHECK (jsonb_typeof(project)='object' AND octet_length(project::text)<150000),
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(proposal_id,version)
);
CREATE TABLE seabird.acceptances (
  proposal_id uuid NOT NULL,
  version integer NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  statement text NOT NULL DEFAULT 'I have reviewed and accept this version of the scope, fee, schedule and terms, and am authorised to accept on behalf of the client.',
  PRIMARY KEY(proposal_id,version),
  FOREIGN KEY(proposal_id,version) REFERENCES seabird.proposal_versions ON DELETE CASCADE
);
ALTER TABLE seabird.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE seabird.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seabird.acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON seabird.proposals,seabird.proposal_versions,seabird.acceptances FROM PUBLIC,anon,authenticated;
GRANT SELECT ON seabird.proposals,seabird.proposal_versions,seabird.acceptances TO authenticated;
CREATE POLICY owner_read ON seabird.proposals FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY owner_read ON seabird.proposal_versions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM seabird.proposals p WHERE p.id=proposal_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY owner_read ON seabird.acceptances FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM seabird.proposals p WHERE p.id=proposal_id AND p.user_id=(SELECT auth.uid())));

-- Definer functions are narrow capabilities: owner functions check membership;
-- public functions require an unguessable token and never expose tables or email.
CREATE FUNCTION seabird.publish_proposal(project_id text, project jsonb, expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p seabird.proposals; safe jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false') <> 'false'
    OR auth.jwt()->'app_metadata'->>'cookham_backend_app' IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM seabird.profiles WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sign in to Seabird first.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(project) IS DISTINCT FROM 'object' OR octet_length(project::text)>150000
    OR coalesce(length(project->>'title'),0)=0 OR coalesce(length(project->>'client'),0)=0 THEN
    RAISE EXCEPTION 'Invalid proposal.';
  END IF;
  SELECT jsonb_object_agg(key,value) INTO safe FROM jsonb_each(project)
    WHERE key=ANY(ARRAY['id','title','client','description','deliverables','deliverableItems','currency','tax','fee','deposit','start','conceptDays','animationDays','reviewDays','reviews','finishDays','inputs','terms','paymentNote','rights','changesPolicy']);
  INSERT INTO seabird.proposals(user_id,project_id) VALUES(auth.uid(),publish_proposal.project_id)
    ON CONFLICT ON CONSTRAINT proposals_user_id_project_id_key DO NOTHING;
  SELECT * INTO p FROM seabird.proposals WHERE user_id=auth.uid() AND proposals.project_id=publish_proposal.project_id FOR UPDATE;
  IF expected_version IS DISTINCT FROM p.version THEN RAISE EXCEPTION 'Published version changed. Reopen sharing and review before publishing.' USING ERRCODE='40001'; END IF;
  IF p.revoked THEN RAISE EXCEPTION 'This link was revoked. Create a new link before publishing.'; END IF;
  IF EXISTS(SELECT 1 FROM seabird.proposal_versions v WHERE v.proposal_id=p.id AND v.version=p.version AND v.project=safe) THEN
    RETURN jsonb_build_object('token',p.token,'version',p.version);
  END IF;
  UPDATE seabird.proposals SET version=version+1 WHERE id=p.id RETURNING * INTO p;
  INSERT INTO seabird.proposal_versions(proposal_id,version,project) VALUES(p.id,p.version,safe);
  RETURN jsonb_build_object('token',p.token,'version',p.version);
END; $$;

CREATE FUNCTION seabird.manage_proposal(project_id text, action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p seabird.proposals;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM seabird.profiles WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM seabird.proposals WHERE user_id=auth.uid() AND proposals.project_id=manage_proposal.project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publish the proposal first.'; END IF;
  IF action='revoke' THEN UPDATE seabird.proposals SET revoked=true WHERE id=p.id;
  ELSIF action='replace' AND p.revoked THEN UPDATE seabird.proposals SET token=gen_random_uuid(),revoked=false WHERE id=p.id;
  ELSE RAISE EXCEPTION 'Invalid link action.'; END IF;
  RETURN jsonb_build_object('ok',true);
END; $$;

GRANT USAGE ON SCHEMA seabird TO anon;
CREATE FUNCTION seabird.read_proposal(link_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('project',v.project,'version',p.version,'published_at',v.published_at,'accepted_at',a.accepted_at)
  FROM seabird.proposals p JOIN seabird.proposal_versions v ON v.proposal_id=p.id AND v.version=p.version
  LEFT JOIN seabird.acceptances a ON a.proposal_id=p.id AND a.version=p.version
  WHERE p.token=link_token AND NOT p.revoked;
$$;

CREATE FUNCTION seabird.accept_proposal(link_token uuid, expected_version integer, client_name text, client_email text, agreed boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p seabird.proposals; a seabird.acceptances;
BEGIN
  IF agreed IS DISTINCT FROM true OR coalesce(length(trim(client_name)),0) NOT BETWEEN 1 AND 200
    OR coalesce(length(trim(client_email)),0) NOT BETWEEN 3 AND 254
    OR trim(client_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter your name, email and agreement to continue.'; END IF;
  SELECT * INTO p FROM seabird.proposals WHERE token=link_token AND NOT revoked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This link is unavailable.'; END IF;
  IF p.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'The proposal changed. Reload and review the latest version before accepting.' USING ERRCODE='40001'; END IF;
  INSERT INTO seabird.acceptances(proposal_id,version,name,email) VALUES(p.id,p.version,trim(client_name),lower(trim(client_email))) ON CONFLICT DO NOTHING;
  SELECT * INTO a FROM seabird.acceptances WHERE proposal_id=p.id AND version=p.version;
  RETURN jsonb_build_object('version',a.version,'accepted_at',a.accepted_at);
END; $$;
REVOKE ALL ON FUNCTION seabird.publish_proposal(text,jsonb,integer),seabird.manage_proposal(text,text),seabird.read_proposal(uuid),seabird.accept_proposal(uuid,integer,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION seabird.publish_proposal(text,jsonb,integer),seabird.manage_proposal(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION seabird.read_proposal(uuid),seabird.accept_proposal(uuid,integer,text,text,boolean) TO anon,authenticated;
