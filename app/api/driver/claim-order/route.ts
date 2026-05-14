import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { sendOrderStatusPush } from "@/lib/push/web-push";

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  const routeSb = await createRouteHandlerSupabase();
  if (!routeSb) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }

  const {
    data: { user },
  } = await routeSb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  // Verify the user is an active driver
  const { data: driverRow } = await routeSb
    .from("delivery_drivers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!driverRow?.id) {
    return NextResponse.json({ error: "حسابك ليس سائقاً معتمداً." }, { status: 403 });
  }

  if (driverRow.status === "offline") {
    return NextResponse.json({ error: "حساب السائق غير نشط." }, { status: 403 });
  }

  // Parse the request body
  let body: { orderId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId مطلوب." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  
  // Use a transaction to safely claim the order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('claim_order', {
    p_order_id: orderId,
    p_driver_id: driverRow.id
  });

  if (error) {
    console.error("Error claiming order:", error);
    
    // Handle specific error cases
    if (error.message.includes('ORDER_NOT_FOUND')) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }
    if (error.message.includes('ORDER_NOT_AVAILABLE_FOR_CLAIM')) {
      return NextResponse.json({ error: "هذا الطلب غير متاح للمطالبة حالياً." }, { status: 409 });
    }
    if (error.message.includes('ORDER_ALREADY_CLAIMED')) {
      return NextResponse.json({ error: "لقد تم مطالبة هذا الطلب بالفعل من قبل سائق آخر." }, { status: 409 });
    }
    if (error.message.includes('DRIVER_NOT_FOUND_OR_INACTIVE')) {
      return NextResponse.json({ error: "حساب السائق غير نشط." }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if the claim was successful
  if (!data || !data.success) {
    const errorType = data?.error || 'UNKNOWN_ERROR';
    
    if (errorType === 'ORDER_ALREADY_CLAIMED') {
      return NextResponse.json({ 
        error: "لقد تم مطالبة هذا الطلب بالفعل من قبل سائق آخر." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: `فشلت عملية المطالبة: ${errorType}` 
    }, { status: 400 });
  }

  // Log the successful claim
  console.log(`Order ${orderId} successfully claimed by driver ${driverRow.id}`);
  
  // Send push notification about the order status change
  try {
    await sendOrderStatusPush(orderId, 'dispatched');
  } catch (pushError) {
    console.error("Failed to send push notification:", pushError);
    // Continue execution even if push notification fails
  }

  // Fetch the updated order details to return to the driver
  const { data: updatedOrder, error: fetchError } = await supabase
    .from("orders")
    .select(`
      id,
      short_code,
      status,
      customer_name,
      customer_phone,
      customer_address,
      total,
      payment_method,
      notes,
      created_at,
      picked_at,
      vendors (
        id,
        name,
        slug
      ),
      order_items (
        id,
        product_name,
        quantity,
        line_total
      )
    `)
    .eq("id", orderId)
    .single();

  if (fetchError) {
    console.error("Error fetching updated order:", fetchError);
    // Return success with minimal data if we can't fetch the full order
    return NextResponse.json({
      success: true,
      order: {
        id: data.order_id,
        status: 'dispatched',
        claimed_at: data.claimed_at,
        driver_id: data.driver_id
      },
      message: "تم مطالبة الطلب بنجاح"
    });
  }

  return NextResponse.json({
    success: true,
    order: updatedOrder,
    message: "تم مطالبة الطلب بنجاح"
  });
}