import { createClient } from '@supabase/supabase-js';

const url = 'https://irtqksiasbceutqtionw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHFrc2lhc2JjZXV0cXRpb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjg3OTYsImV4cCI6MjEwNDEwNDc5Nn0.Ohm-wTOX1M-gz7hG4xP4iFmDEhv_8yOCPADS6el6pVk';

const supabase = createClient(url, key);

async function testDeduction() {
  console.log('=== TEST SUPABASE UPDATE ===');
  
  // 1. Obtener producto
  const { data: prods, error: pErr } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);
  
  console.log('Productos activos:', prods?.length, pErr);
  const paper = (prods || []).find(p => p.name.toLowerCase().includes('carta'));
  console.log('Paper product encontrado:', paper);

  if (paper) {
    // 2. Intentar descontar 4 hojas
    const targetStock = Number(paper.stock) - 4;
    console.log(`Intentando actualizar stock de ${paper.stock} a ${targetStock}...`);
    
    const { data: updated, error: uErr } = await supabase
      .from('products')
      .update({ stock: targetStock, updated_at: new Date().toISOString() })
      .eq('id', paper.id)
      .select();

    console.log('Resultado update:', updated, uErr);

    // 3. Insertar stock_movement
    const { data: sm, error: smErr } = await supabase
      .from('stock_movements')
      .insert([
        {
          product_id: paper.id,
          type: 'sale',
          quantity: -4,
          previous_stock: paper.stock,
          new_stock: targetStock,
          note: 'Deducción de prueba de 4 hojas carta'
        }
      ])
      .select();

    console.log('Resultado stock_movement:', sm, smErr);
  }

  // 4. Ver historial de stock_movements
  const { data: allMovs, error: mErr } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('Últimos stock_movements en BD:', allMovs, mErr);
}

testDeduction();
