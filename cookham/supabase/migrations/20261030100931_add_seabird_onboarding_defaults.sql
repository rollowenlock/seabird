ALTER TABLE seabird.profiles
  DROP CONSTRAINT profile_organisation_type,
  ADD COLUMN provider_label text,
  ADD COLUMN project_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN onboarding_completed_at timestamptz,
  ADD CONSTRAINT profile_organisation_type CHECK (
    organisation_type IN ('unspecified', 'individual', 'freelancer', 'studio', 'practice', 'company', 'other')
  ),
  ADD CONSTRAINT profile_provider_label CHECK (
    provider_label IS NULL OR length(btrim(provider_label)) BETWEEN 1 AND 60
  ),
  ADD CONSTRAINT profile_project_defaults CHECK (
    jsonb_typeof(project_defaults) = 'object'
    AND octet_length(project_defaults::text) <= 5000
    AND project_defaults - ARRAY[
      'currency','tax','rate','deposit','paymentNote','conceptDays','animationDays',
      'reviews','reviewDays','finishDays','makingStageName'
    ]::text[] = '{}'::jsonb
    AND (NOT project_defaults ? 'currency' OR project_defaults->>'currency' IN ('NZD','USD','AUD','GBP','EUR'))
    AND (NOT project_defaults ? 'tax' OR (jsonb_typeof(project_defaults->'tax') = 'string' AND length(project_defaults->>'tax') BETWEEN 1 AND 200))
    AND (NOT project_defaults ? 'rate' OR (jsonb_typeof(project_defaults->'rate') = 'number' AND (project_defaults->>'rate')::numeric BETWEEN 0 AND 1000000))
    AND (NOT project_defaults ? 'deposit' OR (jsonb_typeof(project_defaults->'deposit') = 'number' AND (project_defaults->>'deposit')::numeric BETWEEN 0 AND 100 AND mod((project_defaults->>'deposit')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'paymentNote' OR (jsonb_typeof(project_defaults->'paymentNote') = 'string' AND length(project_defaults->>'paymentNote') BETWEEN 1 AND 10000))
    AND (NOT project_defaults ? 'conceptDays' OR (jsonb_typeof(project_defaults->'conceptDays') = 'number' AND (project_defaults->>'conceptDays')::numeric BETWEEN 1 AND 90 AND mod((project_defaults->>'conceptDays')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'animationDays' OR (jsonb_typeof(project_defaults->'animationDays') = 'number' AND (project_defaults->>'animationDays')::numeric BETWEEN 1 AND 90 AND mod((project_defaults->>'animationDays')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'reviews' OR (jsonb_typeof(project_defaults->'reviews') = 'number' AND (project_defaults->>'reviews')::numeric BETWEEN 1 AND 6 AND mod((project_defaults->>'reviews')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'reviewDays' OR (jsonb_typeof(project_defaults->'reviewDays') = 'number' AND (project_defaults->>'reviewDays')::numeric BETWEEN 1 AND 90 AND mod((project_defaults->>'reviewDays')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'finishDays' OR (jsonb_typeof(project_defaults->'finishDays') = 'number' AND (project_defaults->>'finishDays')::numeric BETWEEN 1 AND 90 AND mod((project_defaults->>'finishDays')::numeric, 1) = 0))
    AND (NOT project_defaults ? 'makingStageName' OR (jsonb_typeof(project_defaults->'makingStageName') = 'string' AND length(btrim(project_defaults->>'makingStageName')) BETWEEN 1 AND 100))
  );

UPDATE seabird.profiles
SET provider_label = CASE organisation_type
  WHEN 'freelancer' THEN 'Freelancer'
  WHEN 'studio' THEN 'Studio'
  WHEN 'practice' THEN 'Practice'
  WHEN 'company' THEN 'Company'
  WHEN 'other' THEN 'Other'
  ELSE 'Provider'
END,
onboarding_completed_at = now()
WHERE display_name IS NOT NULL AND length(btrim(display_name)) > 0;

GRANT UPDATE(provider_label, project_defaults, onboarding_completed_at) ON seabird.profiles TO authenticated;
