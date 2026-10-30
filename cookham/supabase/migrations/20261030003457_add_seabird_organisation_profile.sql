ALTER TABLE seabird.profiles
  ADD COLUMN display_name text,
  ADD COLUMN organisation_type text NOT NULL DEFAULT 'unspecified',
  ADD COLUMN work_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN logo_path text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT profile_display_name_length CHECK (
    display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 120
  ),
  ADD CONSTRAINT profile_organisation_type CHECK (
    organisation_type IN ('unspecified', 'freelancer', 'studio', 'practice', 'company', 'other')
  ),
  ADD CONSTRAINT profile_work_types_size CHECK (
    cardinality(work_types) <= 12
    AND octet_length(array_to_string(work_types, ',')) <= 1000
  ),
  ADD CONSTRAINT profile_logo_path CHECK (
    logo_path IS NULL OR logo_path = user_id::text || '/logo'
  );

GRANT UPDATE(display_name, organisation_type, work_types, logo_path) ON seabird.profiles TO authenticated;

CREATE FUNCTION seabird.touch_profile_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION seabird.touch_profile_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER touch_profile_updated_at
BEFORE UPDATE ON seabird.profiles
FOR EACH ROW EXECUTE FUNCTION seabird.touch_profile_updated_at();

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seabird-branding',
  'seabird-branding',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY seabird_branding_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'seabird-branding'
  AND name = (SELECT auth.uid())::text || '/logo'
);

CREATE POLICY seabird_branding_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seabird-branding'
  AND name = (SELECT auth.uid())::text || '/logo'
  AND EXISTS (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid()))
);

CREATE POLICY seabird_branding_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'seabird-branding'
  AND name = (SELECT auth.uid())::text || '/logo'
  AND EXISTS (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'seabird-branding'
  AND name = (SELECT auth.uid())::text || '/logo'
  AND EXISTS (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid()))
);

CREATE POLICY seabird_branding_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'seabird-branding'
  AND name = (SELECT auth.uid())::text || '/logo'
  AND EXISTS (SELECT 1 FROM seabird.profiles p WHERE p.user_id = (SELECT auth.uid()))
);
