-- Remove the default UUID generator so it does not auto-generate UUIDs
ALTER TABLE public.players ALTER COLUMN id DROP DEFAULT;

-- Drop the primary key constraint
ALTER TABLE public.players DROP CONSTRAINT players_pkey;

-- Convert players.id from UUID to TEXT
ALTER TABLE public.players ALTER COLUMN id TYPE TEXT USING id::text;

-- Recreate the primary key constraint on TEXT type
ALTER TABLE public.players ADD CONSTRAINT players_pkey PRIMARY KEY (id);
