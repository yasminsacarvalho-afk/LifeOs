insert into storage.buckets (id, name, public) values ('livros', 'livros', true) on conflict (id) do nothing;
create policy "Public Access Livros" on storage.objects for select using ( bucket_id = 'livros' );
create policy "Public Insert Livros" on storage.objects for insert with check ( bucket_id = 'livros' );
create policy "Public Update Livros" on storage.objects for update using ( bucket_id = 'livros' );
create policy "Public Delete Livros" on storage.objects for delete using ( bucket_id = 'livros' );
