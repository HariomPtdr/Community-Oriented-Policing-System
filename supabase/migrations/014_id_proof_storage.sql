-- Add id_proof_url to profiles table for storing uploaded ID proof document URL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_proof_url TEXT DEFAULT NULL;

-- Create storage buckets for profile photos and ID proof documents
-- Note: Run these via Supabase Dashboard if INSERT INTO storage.buckets doesn't work
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-proofs', 'id-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Storage policies for id-proofs bucket
CREATE POLICY "Users can upload own id proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = 'id-proofs');

CREATE POLICY "Users can update own id proof"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'id-proofs');

CREATE POLICY "Anyone can view id proofs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'id-proofs');
