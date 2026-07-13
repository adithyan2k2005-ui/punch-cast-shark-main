-- Convert players.id from UUID to TEXT
ALTER TABLE public.players ALTER COLUMN id TYPE TEXT USING id::text;
-- Remove the default UUID generator so it does not auto-generate UUIDs
ALTER TABLE public.players ALTER COLUMN id DROP DEFAULT;
