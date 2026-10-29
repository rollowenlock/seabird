-- Store each editable project independently. The legacy workspace row remains
-- during the expand phase so the currently deployed client keeps working.
CREATE TABLE seabird.projects (
  user_id uuid NOT NULL REFERENCES seabird.profiles(user_id) ON DELETE CASCADE,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 200),
  project jsonb NOT NULL CHECK (
    jsonb_typeof(project) = 'object'
    AND octet_length(project::text) < 150000
    AND project->>'id' = id
    AND length(project->>'title') BETWEEN 1 AND 200
    AND length(project->>'client') BETWEEN 1 AND 200
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE seabird.projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON seabird.projects FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON seabird.projects TO authenticated;
GRANT INSERT(user_id, id, project) ON seabird.projects TO authenticated;
GRANT UPDATE(project) ON seabird.projects TO authenticated;

CREATE POLICY own_projects ON seabird.projects
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM seabird.profiles p
      WHERE p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM seabird.profiles p
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

CREATE FUNCTION seabird.bump_project_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION seabird.bump_project_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bump_project_revision BEFORE UPDATE ON seabird.projects
FOR EACH ROW EXECUTE FUNCTION seabird.bump_project_revision();

-- Backfill existing workspace arrays. All current clients create IDs, but the
-- fallback preserves any older row that predates project IDs.
WITH expanded AS (
  SELECT
    w.user_id,
    coalesce(nullif(item->>'id', ''), gen_random_uuid()::text) AS id,
    item
  FROM seabird.workspaces w
  CROSS JOIN LATERAL jsonb_array_elements(w.projects) AS item
  WHERE jsonb_typeof(item) = 'object'
)
INSERT INTO seabird.projects(user_id, id, project)
SELECT user_id, id, jsonb_set(item, '{id}', to_jsonb(id), true)
FROM expanded
ON CONFLICT (user_id, id) DO UPDATE SET project = EXCLUDED.project;

-- Keep the old client compatible during rollout. Workspace saves mirror valid
-- project documents forward, but never delete project rows that may have been
-- created by the new client on another device.
CREATE FUNCTION seabird.sync_workspace_projects() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.projects)
  LOOP
    IF jsonb_typeof(item) = 'object'
      AND length(item->>'id') BETWEEN 1 AND 200
      AND octet_length(item::text) < 150000 THEN
      INSERT INTO seabird.projects(user_id, id, project)
      VALUES (NEW.user_id, item->>'id', item)
      ON CONFLICT (user_id, id) DO UPDATE
        SET project = EXCLUDED.project
        WHERE seabird.projects.project IS DISTINCT FROM EXCLUDED.project;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION seabird.sync_workspace_projects() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_workspace_projects
AFTER INSERT OR UPDATE OF projects ON seabird.workspaces
FOR EACH ROW EXECUTE FUNCTION seabird.sync_workspace_projects();
