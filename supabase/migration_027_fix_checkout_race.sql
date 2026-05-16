-- migration_027: إصلاح سباق جلسة الدفع بالبطاقة
--
-- المشكلة: الطلبات بالدفع البطاقي كانت تُنشأ بـ status='broadcast' فوراً،
-- فيراها السائقون ويطلبونها قبل تأكيد الدفع.
--
-- الحل: الطلبات البطاقيّة تُنشأ بـ status='new' → يُحوّلها webhook إلى 'broadcast'
-- بعد تأكيد Stripe.
--
-- هذا الترحيل:
-- 1) ينظّف الطلبات البطاقيّة العالقة في 'new' (> 15 دقيقة بدون دفع)
-- 2) يضيف دالة RPC للتحقق من حالة الدفع قبل البثّ

-- ============================================================
-- 1) تنظيف الطلبات العالقة (بطاقة + new + قديمة > 15 دقيقة)
-- ============================================================

update public.orders
set status = 'cancelled',
    cancellation_reason = 'انتهت مهلة الدفع (15 دقيقة)'
where payment_method = 'card'
  and status = 'new'
  and created_at < now() - interval '15 minutes';

-- ============================================================
-- 2) دالة RPC: تحويل طلب مدفوع إلى broadcast (idempotent)
-- ============================================================

create or replace function public.broadcast_paid_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text; v_payment text;
begin
  select status, payment_method into v_status, v_payment
    from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  if v_status <> 'new' then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_NEW', 'current_status', v_status);
  end if;
  if v_payment <> 'card' then
    return jsonb_build_object('success', false, 'error', 'NOT_CARD_PAYMENT');
  end if;

  update public.orders
     set status = 'broadcast',
         broadcast_at = now(),
         accepted_at = now()
   where id = p_order_id and status = 'new';

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', 'broadcast');
end; $$;

grant execute on function public.broadcast_paid_order(uuid) to authenticated;

-- ============================================================
-- ملاحظات:
-- - Stripe webhook يستخدم الآن تحديث مباشر (ليس RPC) للأداء.
-- - الدالة موجودة كواجهة بديلة يمكن استدعاؤها يدوياً أو من job.
-- - للطلبات العالقة القديمة: شغّل cleanup يدوياً أو أضف cron job.
-- ============================================================
