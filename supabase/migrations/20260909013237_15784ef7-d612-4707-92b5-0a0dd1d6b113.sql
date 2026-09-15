CREATE POLICY "No direct storage reads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage writes" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage updates" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage deletes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id <> 'evidence-photos');