-- Freeze explicit forecast dates into new client versions while keeping owner-only
-- workflow state, actual completion dates and delay notes out of public proposals.
CREATE OR REPLACE FUNCTION seabird.publish_proposal(project_id text, project jsonb, expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p seabird.proposals; safe jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false') <> 'false'
    OR auth.jwt()->'app_metadata'->>'cookham_backend_app' IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM seabird.profiles WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sign in to Seabird first.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(project) IS DISTINCT FROM 'object' OR octet_length(project::text)>150000
    OR coalesce(length(project->>'title'),0)=0 OR coalesce(length(project->>'client'),0)=0
    OR (
      project ? 'stagePlan' AND (
        jsonb_typeof(project->'stagePlan') IS DISTINCT FROM 'array'
        OR jsonb_array_length(project->'stagePlan') NOT BETWEEN 2 AND 20
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(project->'stagePlan') stage
          WHERE jsonb_typeof(stage) IS DISTINCT FROM 'object'
            OR coalesce(length(stage->>'key'),0) NOT BETWEEN 1 AND 64
            OR coalesce(stage->>'key','') !~ '^[a-z0-9-]+$'
            OR coalesce(length(stage->>'name'),0) NOT BETWEEN 1 AND 100
            OR coalesce(length(stage->>'owner'),0) NOT BETWEEN 1 AND 200
            OR coalesce(stage->>'start','') !~ '^\d{4}-\d{2}-\d{2}$'
            OR coalesce(stage->>'end','') !~ '^\d{4}-\d{2}-\d{2}$'
            OR coalesce(stage->>'start','') > coalesce(stage->>'end','')
        )
        OR (
          SELECT count(*) <> count(DISTINCT stage->>'key')
          FROM jsonb_array_elements(project->'stagePlan') stage
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(project->'stagePlan') WITH ORDINALITY current_stage(stage, position)
          JOIN jsonb_array_elements(project->'stagePlan') WITH ORDINALITY previous_stage(stage, position)
            ON previous_stage.position + 1 = current_stage.position
          WHERE coalesce(current_stage.stage->>'start','') < coalesce(previous_stage.stage->>'end','')
        )
      )
    ) THEN
    RAISE EXCEPTION 'Invalid proposal.';
  END IF;
  SELECT jsonb_object_agg(key,value) INTO safe FROM jsonb_each(project)
    WHERE key=ANY(ARRAY['id','title','client','description','deliverables','deliverableItems','currency','tax','fee','deposit','start','conceptDays','animationDays','reviewDays','reviews','finishDays','inputs','terms','paymentNote','rights','changesPolicy','stagePlan']);
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

REVOKE ALL ON FUNCTION seabird.publish_proposal(text,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION seabird.publish_proposal(text,jsonb,integer) TO authenticated;
