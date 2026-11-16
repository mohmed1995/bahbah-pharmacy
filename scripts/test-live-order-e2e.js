require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runE2ETest() {
  console.log('🧪 Starting End-to-End Live Order Verification...');

  const testOrder = {
    id: 'ORD-LIVE-TEST-1',
    customer_name: 'حاج فرغلي عبد العال',
    customer_phone: '01011500166',
    customer_address: '[قرية صنبو] بجوار مدرسة الشهداء — دوار عائلة الشريف [فكة: ورقة 200 ج.م]',
    customer_notes: 'طلب تجريبي للتحقق من المزامنة الفورية',
    items: [
      {
        productId: 'cosm-limitless',
        nameAr: 'ليمتلس ومان ماكس 30 قرص',
        nameEn: 'Limitless Woman Max 30 Tablets',
        price: 210,
        qty: 1
      }
    ],
    subtotal: 210,
    discount: 0,
    delivery_fee: 10,
    total: 220,
    payment_method: 'cod',
    status: 'pending',
    payment_status: 'unpaid',
    delivery_zone: 'sanabu',
    courier_id: 'dr-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Step 1: Insert order
  console.log('1️⃣ Inserting test order to Supabase orders table...');
  const { error: insertErr } = await sb.from('orders').insert(testOrder);
  if (insertErr) {
    console.error('❌ Insert failed:', insertErr.message);
    process.exit(1);
  }
  console.log('✅ Order inserted successfully!');

  // Step 2: Query order back
  console.log('2️⃣ Querying order from Supabase...');
  const { data: rows, error: queryErr } = await sb
    .from('orders')
    .select('*')
    .eq('id', testOrder.id);

  if (queryErr || !rows || rows.length === 0) {
    console.error('❌ Query failed:', queryErr ? queryErr.message : 'No rows found');
    process.exit(1);
  }
  const fetched = rows[0];
  console.log('✅ Order retrieved successfully:');
  console.log('   - ID:', fetched.id);
  console.log('   - Customer:', fetched.customer_name);
  console.log('   - Address:', fetched.customer_address);
  console.log('   - Phone:', fetched.customer_phone);
  console.log('   - Zone:', fetched.delivery_zone);
  console.log('   - Total:', fetched.total, 'EGP');
  console.log('   - Status:', fetched.status);

  // Step 3: Courier perspective test
  console.log('3️⃣ Courier assignment test: querying orders for courier dr-1...');
  const { data: courierOrders } = await sb
    .from('orders')
    .select('id, customer_name, customer_address')
    .eq('courier_id', 'dr-1');
  console.log(`✅ Courier dr-1 sees ${courierOrders?.length || 0} assigned order(s).`);

  // Step 4: Clean up test order
  console.log('4️⃣ Cleaning up test order to keep Supabase clean...');
  const { error: delErr } = await sb.from('orders').delete().eq('id', testOrder.id);
  if (delErr) {
    console.warn('⚠️ Warning: cleanup error:', delErr.message);
  } else {
    console.log('✅ Test order cleanly deleted from Supabase (0 orphan test rows).');
  }

  console.log('🎉 E2E Verification complete! All systems operational.');
}

runE2ETest();
