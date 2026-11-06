-- Delete one owner-scoped project and every client-facing record derived from it.
-- The revision check prevents a stale browser from deleting a newer project.
CREATE FUNCTION seabird.delete_project_record(project_id text, expected_revision bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target seabird.projects;
BEGIN
  IF auth.uid() IS NULL
    OR coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'false'
    OR auth.jwt()->'app_metadata'->>'cookham_backend_app' IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM seabird.profiles WHERE user_id = auth.uid()
    ) THEN
    RAISE EXCEPTION 'Sign in first.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target
  FROM seabird.projects
  WHERE user_id = auth.uid()
    AND id = delete_project_record.project_id
    AND revision = delete_project_record.expected_revision
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This project changed elsewhere. Refresh before deleting it.'
      USING ERRCODE = '40001';
  END IF;

  -- Proposal children cascade through versions, acceptances and public progress.
  DELETE FROM seabird.proposals
  WHERE user_id = auth.uid()
    AND proposals.project_id = delete_project_record.project_id;

  DELETE FROM seabird.projects
  WHERE user_id = auth.uid()
    AND id = delete_project_record.project_id;

  RETURN jsonb_build_object('ok', true, 'project_id', target.id);
END;
$$;

REVOKE ALL ON FUNCTION seabird.delete_project_record(text, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION seabird.delete_project_record(text, bigint)
  TO authenticated;
