
-- Authenticated users can upload to their own folder (first path segment = uid)
CREATE POLICY "Users upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('selfies','attachments','avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('selfies','attachments','avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('selfies','attachments','avatars')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('selfies','attachments','avatars')
    AND public.has_role(auth.uid(), 'admin')
  );
