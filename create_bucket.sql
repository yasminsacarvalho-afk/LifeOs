insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true) on conflict (id) do nothing;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'receipts' );
create policy "Public Insert" on storage.objects for insert with check ( bucket_id = 'receipts' );
