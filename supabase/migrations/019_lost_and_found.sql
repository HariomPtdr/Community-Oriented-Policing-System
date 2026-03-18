-- =============================================
-- 019_lost_and_found.sql
-- Lost & Found Complete Schema — Police-backed item recovery
-- =============================================

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE lf_report_type AS ENUM ('lost', 'found');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_status AS ENUM (
    'active',       -- currently visible and open
    'matched',      -- potential match found, under review
    'claimed',      -- someone has claimed ownership
    'reunited',     -- confirmed reunited with owner
    'in_custody',   -- physically held at police station
    'expired',      -- auto-expired after 90/30 days
    'archived',     -- manually archived by user
    'removed'       -- removed by officer
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_category AS ENUM (
    'mobile_phone',
    'wallet_bag',
    'keys',
    'documents',
    'vehicle',
    'jewellery',
    'electronics',
    'clothing',
    'pets',
    'person',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_claim_status AS ENUM (
    'pending',      -- claim submitted, awaiting officer review
    'verifying',    -- officer asked for proof
    'approved',     -- officer verified, handover in progress
    'rejected',     -- false claim
    'completed'     -- item physically handed over
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost-found-media',
  'lost-found-media',
  true,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "lf_media_insert" ON storage.objects;
CREATE POLICY "lf_media_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lost-found-media');

DROP POLICY IF EXISTS "lf_media_select" ON storage.objects;
CREATE POLICY "lf_media_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lost-found-media');

DROP POLICY IF EXISTS "lf_media_delete" ON storage.objects;
CREATE POLICY "lf_media_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lost-found-media');

-- ── Main lost_found_items table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who reported
  reporter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type         lf_report_type NOT NULL,
  status              lf_status NOT NULL DEFAULT 'active',

  -- Item basics
  item_name           TEXT NOT NULL,
  category            lf_category NOT NULL,
  description         TEXT NOT NULL,
  brand               TEXT,
  color               TEXT,

  -- Category-specific data (JSONB)
  category_details    JSONB DEFAULT '{}',

  -- Contact info from reporter
  contact_name        TEXT NOT NULL,
  contact_phone       TEXT,
  contact_email       TEXT,

  -- Contact preferences
  contact_via_platform BOOLEAN DEFAULT TRUE,
  show_phone          BOOLEAN DEFAULT FALSE,
  show_email          BOOLEAN DEFAULT FALSE,

  -- Location
  location_text       TEXT NOT NULL,
  location_area       TEXT,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,

  -- Timing
  incident_date       DATE NOT NULL,
  incident_time       TEXT,

  -- Reward (optional)
  has_reward          BOOLEAN DEFAULT FALSE,
  reward_amount       NUMERIC(10, 2),
  reward_note         TEXT,

  -- Photos (array of storage paths)
  photo_paths         TEXT[] DEFAULT '{}',
  primary_photo_path  TEXT,

  -- AI matching
  ai_keywords         TEXT[],
  ai_match_checked_at TIMESTAMPTZ,

  -- Expiry
  expires_at          TIMESTAMPTZ,
  expiry_warned       BOOLEAN DEFAULT FALSE,
  renewal_count       INTEGER DEFAULT 0,

  -- Officer fields
  officer_notes       TEXT,
  assigned_officer_id UUID REFERENCES profiles(id),

  -- Stats
  view_count          INTEGER DEFAULT 0,
  claim_count         INTEGER DEFAULT 0
);

ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lf_reporter     ON lost_found_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_lf_status       ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lf_category     ON lost_found_items(category);
CREATE INDEX IF NOT EXISTS idx_lf_type         ON lost_found_items(report_type);
CREATE INDEX IF NOT EXISTS idx_lf_date         ON lost_found_items(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_lf_expires      ON lost_found_items(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_lf_item_name    ON lost_found_items USING GIN(to_tsvector('english', item_name));

-- ── RLS Policies for lost_found_items ────────────────────────────────────────

-- Anyone authenticated can read active/matched/claimed/reunited items
CREATE POLICY "lf_items_select_active"
ON lost_found_items FOR SELECT
TO authenticated
USING (
  status IN ('active', 'matched', 'claimed', 'reunited')
  OR reporter_id = auth.uid()
);

-- Any citizen can insert their own
CREATE POLICY "lf_items_insert_own"
ON lost_found_items FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Reporter can update their own active items
CREATE POLICY "lf_items_update_own"
ON lost_found_items FOR UPDATE
TO authenticated
USING (reporter_id = auth.uid())
WITH CHECK (reporter_id = auth.uid());

-- ── Claims table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  item_id             UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  claimant_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status              lf_claim_status NOT NULL DEFAULT 'pending',

  -- What the claimant says
  claim_message       TEXT NOT NULL,
  proof_description   TEXT,
  proof_file_paths    TEXT[] DEFAULT '{}',

  -- Officer review
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  handover_date       DATE,
  handover_location   TEXT,
  handover_notes      TEXT,

  UNIQUE (item_id, claimant_id)
);

ALTER TABLE lost_found_claims ENABLE ROW LEVEL SECURITY;

-- Claimant can read/insert their own claims
CREATE POLICY "lf_claims_select_own"
ON lost_found_claims FOR SELECT
TO authenticated
USING (claimant_id = auth.uid());

CREATE POLICY "lf_claims_insert_own"
ON lost_found_claims FOR INSERT
TO authenticated
WITH CHECK (claimant_id = auth.uid());

-- Reporter can see claims on their own items
CREATE POLICY "lf_claims_reporter_select"
ON lost_found_claims FOR SELECT
TO authenticated
USING (
  item_id IN (
    SELECT id FROM lost_found_items WHERE reporter_id = auth.uid()
  )
);

-- ── AI Matches table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  lost_item_id        UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id       UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,

  match_score         NUMERIC(5, 2) NOT NULL,
  match_reasons       TEXT[],
  ai_explanation      TEXT,

  is_notified         BOOLEAN DEFAULT FALSE,
  is_dismissed        BOOLEAN DEFAULT FALSE,
  dismissed_by        UUID REFERENCES profiles(id),
  dismissed_reason    TEXT,

  led_to_reunion      BOOLEAN DEFAULT FALSE,

  UNIQUE (lost_item_id, found_item_id)
);

ALTER TABLE lost_found_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lf_matches_select"
ON lost_found_matches FOR SELECT
TO authenticated
USING (
  lost_item_id IN (SELECT id FROM lost_found_items WHERE reporter_id = auth.uid())
  OR found_item_id IN (SELECT id FROM lost_found_items WHERE reporter_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_matches_lost    ON lost_found_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found   ON lost_found_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_score   ON lost_found_matches(match_score DESC);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Auto updated_at
CREATE TRIGGER set_lf_items_updated_at
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lf_claims_updated_at
  BEFORE UPDATE ON lost_found_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set expires_at on insert
CREATE OR REPLACE FUNCTION set_lf_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.expires_at := CASE NEW.report_type
    WHEN 'lost'  THEN now() + INTERVAL '90 days'
    WHEN 'found' THEN now() + INTERVAL '30 days'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lf_insert_set_expiry ON lost_found_items;
CREATE TRIGGER on_lf_insert_set_expiry
  BEFORE INSERT ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION set_lf_expiry();

-- Increment claim_count on new claim
CREATE OR REPLACE FUNCTION increment_lf_claim_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE lost_found_items
  SET claim_count = claim_count + 1
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lf_claim_insert ON lost_found_claims;
CREATE TRIGGER on_lf_claim_insert
  AFTER INSERT ON lost_found_claims
  FOR EACH ROW EXECUTE FUNCTION increment_lf_claim_count();

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Auto-match trigger: find potential matches when item is inserted
CREATE OR REPLACE FUNCTION check_lf_matches()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  match_record RECORD;
  opposite_type lf_report_type;
  notif_title TEXT;
  notif_body TEXT;
  lost_id UUID;
  found_id UUID;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Determine opposite type
  opposite_type := CASE NEW.report_type
    WHEN 'lost' THEN 'found'::lf_report_type
    WHEN 'found' THEN 'lost'::lf_report_type
  END;

  FOR match_record IN
    SELECT * FROM lost_found_items
    WHERE report_type = opposite_type
    AND category = NEW.category
    AND status IN ('active', 'matched')
    AND (
      item_name ILIKE '%' || NEW.item_name || '%'
      OR NEW.item_name ILIKE '%' || item_name || '%'
      OR similarity(LOWER(item_name), LOWER(NEW.item_name)) > 0.3
    )
    AND reporter_id != NEW.reporter_id
    AND incident_date >= NEW.incident_date - INTERVAL '30 days'
    AND incident_date <= NEW.incident_date + INTERVAL '30 days'
    LIMIT 10
  LOOP
    -- Determine lost/found IDs
    IF NEW.report_type = 'lost' THEN
      lost_id := NEW.id;
      found_id := match_record.id;
    ELSE
      lost_id := match_record.id;
      found_id := NEW.id;
    END IF;

    -- Insert match (skip if exists)
    INSERT INTO lost_found_matches (lost_item_id, found_item_id, match_score, match_reasons)
    VALUES (
      lost_id, found_id,
      ROUND(similarity(LOWER(NEW.item_name), LOWER(match_record.item_name)) * 100),
      ARRAY[
        'Same category: ' || NEW.category::TEXT,
        'Similar name match',
        'Date range within 30 days'
      ]
    )
    ON CONFLICT (lost_item_id, found_item_id) DO NOTHING;

    -- Notify the new reporter
    INSERT INTO notifications (user_id, title, body, type, reference_id)
    VALUES (
      NEW.reporter_id,
      '⚡ Potential Match Found!',
      'A ' || opposite_type::TEXT || ' item "' || match_record.item_name || '" may match your report.',
      'success',
      NEW.id
    );

    -- Notify the existing reporter
    INSERT INTO notifications (user_id, title, body, type, reference_id)
    VALUES (
      match_record.reporter_id,
      '⚡ New Potential Match!',
      'Someone just reported a ' || NEW.report_type::TEXT || ' item "' || NEW.item_name || '" that may match yours.',
      'success',
      match_record.id
    );

    -- Update both items to 'matched'
    UPDATE lost_found_items SET status = 'matched' WHERE id IN (NEW.id, match_record.id) AND status = 'active';
  END LOOP;

  -- Update match check timestamp
  NEW.ai_match_checked_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_lf_matches ON lost_found_items;
CREATE TRIGGER trigger_check_lf_matches
  AFTER INSERT ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION check_lf_matches();

COMMIT;
