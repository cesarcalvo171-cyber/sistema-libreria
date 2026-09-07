import { createClient } from '@supabase/supabase-js';

const url = 'https://irtqksiasbceutqtionw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHFrc2lhc2JjZXV0cXRpb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjg3OTYsImV4cCI6MjEwNDEwNDc5Nn0.Ohm-wTOX1M-gz7hG4xP4iFmDEhv_8yOCPADS6el6pVk';

const supabase = createClient(url, key);

async function checkAll() {
  const { data: prods } = await supabase.from('products').select('*');
  console.log('Todos los productos en BD:');
  prods.forEach(p => console.log(`- [${p.id}] "${p.name}" (Stock: ${p.stock})`));
}

checkAll();
