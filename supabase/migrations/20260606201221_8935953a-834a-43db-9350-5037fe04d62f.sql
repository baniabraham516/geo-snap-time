-- Storage: allow users to delete their own files, admins to delete any
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (bucket_id = ANY (ARRAY['selfies'::text, 'attachments'::text, 'avatars'::text]))
  AND ((storage.foldername(name))[1] = (auth.uid())::text)
);

CREATE POLICY "Admins delete all files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (bucket_id = ANY (ARRAY['selfies'::text, 'attachments'::text, 'avatars'::text]))
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- user_roles: defensive RESTRICTIVE policy so only admins can ever insert/update/delete roles
CREATE POLICY "Only admins can write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
