-- المرحلة A1.8: JWT custom claim role
-- هذا الملف يعرّف دالة hook لإضافة role من profiles إلى access token.
-- بعد التنفيذ:
--   1) Supabase Dashboard -> Authentication -> Hooks -> Custom Access Token
--   2) اختر الدالة: public.custom_access_token_hook
--
-- مخرجات متوقعة داخل JWT:
--   app_metadata.role = "customer" | "platform_admin" | "vendor_staff" | "driver"

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_role text;
begin
  claims := event->'claims';

  select p.role
  into user_role
  from public.profiles p
  where p.id = (event->>'user_id')::uuid;

  if user_role is null then
    user_role := 'customer';
  end if;

  claims := jsonb_set(
    claims,
    '{app_metadata,role}',
    to_jsonb(user_role),
    true
  );

  event := jsonb_set(event, '{claims}', claims, true);
  return event;
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Supabase Auth hook: injects profiles.role into claims.app_metadata.role';
