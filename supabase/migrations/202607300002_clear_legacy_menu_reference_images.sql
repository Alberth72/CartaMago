update public.categories
set image_url = null
where restaurant_id = 'brasas-sazon';

delete from public.menu_photos
where restaurant_id = 'brasas-sazon';
