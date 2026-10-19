CREATE SCHEMA seabird;
REVOKE ALL ON SCHEMA seabird FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA seabird TO authenticated;

CREATE TABLE seabird.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE seabird.workspaces (
  user_id uuid PRIMARY KEY REFERENCES seabird.profiles(user_id) ON DELETE CASCADE,
  projects jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(projects) = 'array' AND octet_length(projects::text) <= 2000000),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE seabird.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seabird.workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA seabird FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON seabird.profiles TO authenticated;
GRANT INSERT(user_id) ON seabird.profiles TO authenticated;
GRANT SELECT, DELETE ON seabird.workspaces TO authenticated;
GRANT INSERT(user_id, projects) ON seabird.workspaces TO authenticated;
GRANT UPDATE(projects) ON seabird.workspaces TO authenticated;

CREATE POLICY own_profile ON seabird.profiles TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY human_members_only ON seabird.profiles AS RESTRICTIVE TO authenticated
  USING (coalesce((SELECT auth.jwt())->>'is_anonymous','false') = 'false'
    AND (SELECT auth.jwt())->'app_metadata'->>'cookham_backend_app' IS NULL)
  WITH CHECK (coalesce((SELECT auth.jwt())->>'is_anonymous','false') = 'false'
    AND (SELECT auth.jwt())->'app_metadata'->>'cookham_backend_app' IS NULL);
CREATE POLICY own_workspace ON seabird.workspaces TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS
    (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid())))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS
    (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid())));

CREATE FUNCTION seabird.bump_workspace_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION seabird.bump_workspace_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bump_workspace_revision BEFORE UPDATE ON seabird.workspaces
FOR EACH ROW EXECUTE FUNCTION seabird.bump_workspace_revision();
