-- 0003_storage.sql
-- Buckets used by the admin dashboard's mobile image upload (Phase 8) —
-- no URL-based product imports, only direct file upload from the device.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public read on all three (product photos, BTC QR, blog covers are all
-- meant to be publicly visible on the storefront).
create policy "product_images_bucket_read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "payment_qr_bucket_read" on storage.objects for select
  using (bucket_id = 'payment-qr');
create policy "blog_images_bucket_read" on storage.objects for select
  using (bucket_id = 'blog-images');

-- Writes restricted to authenticated admins only.
create policy "product_images_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());
create policy "product_images_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

create policy "payment_qr_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'payment-qr' and is_admin());
create policy "payment_qr_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'payment-qr' and is_admin());

create policy "blog_images_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'blog-images' and is_admin());
create policy "blog_images_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'blog-images' and is_admin());
