import { createClient } from '@supabase/supabase-js';

const url = 'https://irtqksiasbceutqtionw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHFrc2lhc2JjZXV0cXRpb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjg3OTYsImV4cCI6MjEwNDEwNDc5Nn0.Ohm-wTOX1M-gz7hG4xP4iFmDEhv_8yOCPADS6el6pVk';

const supabase = createClient(url, key);

async function cleanFix() {
  // 1. Restaurar Foamy Liso Carta a 40
  await supabase.from('products').update({ stock: 40 }).eq('id', '4b870f34-8772-4d62-a584-05921a9eb4d8');
  // 2. Restaurar folde tamaño carta a 100
  await supabase.from('products').update({ stock: 100 }).eq('id', '464e7160-935c-4154-bef0-c7292d6015ff');
  // 3. Dejar Resma de papel Bond Carta en 496 (porque se gastaron 4 hojas en las 3 impresiones)
  await supabase.from('products').update({ stock: 496, units_deducted_per_sale: 3 }).eq('id', 'b453ca72-45ec-4519-98d5-b0b0383c8f6e');

  console.log('Stocks corregidos.');
}

cleanFix();
