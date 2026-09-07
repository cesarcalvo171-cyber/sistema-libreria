import { createClient } from '@supabase/supabase-js';

const url = 'https://irtqksiasbceutqtionw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHFrc2lhc2JjZXV0cXRpb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjg3OTYsImV4cCI6MjEwNDEwNDc5Nn0.Ohm-wTOX1M-gz7hG4xP4iFmDEhv_8yOCPADS6el6pVk';

const supabase = createClient(url, key);

async function fix() {
  // Actualizar Resma de papel Bond Carta con units_deducted_per_sale = 3
  const { data, error } = await supabase
    .from('products')
    .update({ units_deducted_per_sale: 3 })
    .eq('id', 'b453ca72-45ec-4519-98d5-b0b0383c8f6e')
    .select();

  console.log('Updated product:', data, error);
}

fix();
