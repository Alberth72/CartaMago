select order_id, destination_phone, template_name, status, error_code, error_message, created_at
from public.order_notifications
order by created_at desc
limit 5;