import { createClient } from '@supabase/supabase-js';

const url = 'https://irtqksiasbceutqtionw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHFrc2lhc2JjZXV0cXRpb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjg3OTYsImV4cCI6MjEwNDEwNDc5Nn0.Ohm-wTOX1M-gz7hG4xP4iFmDEhv_8yOCPADS6el6pVk';

const supabase = createClient(url, key);

async function check() {
  console.log('=== PRODUCTOS ===');
  const { data: prods, error: pErr } = await supabase.from('products').select('*');
  if (pErr) console.error('Error prods:', pErr);
  else console.log(JSON.stringify(prods, null, 2));

  console.log('=== VENTAS RECIENTES ===');
  const { data: sales, error: sErr } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(3);
  if (sErr) console.error('Error sales:', sErr);
  else console.log(JSON.stringify(sales, null, 2));

  console.log('=== PRINT LOGS ===');
  const { data: printLogs, error: plErr } = await supabase.from('print_logs').select('*').order('created_at', { ascending: false }).limit(5);
  if (plErr) console.error('Error printLogs:', plErr);
  else console.log(JSON.stringify(printLogs, null, 2));

  console.log('=== STOCK MOVEMENTS ===');
  const { data: stockMovs, error: smErr } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(5);
  if (smErr) console.error('Error stockMovs:', smErr);
  else console.log(JSON.stringify(stockMovs, null, 2));
}

check();
