-- ========================================================
-- SISTEMA DE FACTURACIÓN, INVENTARIO, GASTOS, FINANZAS E IMPRESIONES
-- Schema SQL para Supabase / PostgreSQL (Moneda: C$ Córdobas)
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PRODUCTOS (INVENTARIO)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_service BOOLEAN NOT NULL DEFAULT FALSE,
    units_deducted_per_sale INTEGER NOT NULL DEFAULT 1 CHECK (units_deducted_per_sale >= 1),
    deduct_from_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migraciones seguras para columnas si la tabla ya existía
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS units_deducted_per_sale INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deduct_from_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_service BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. TABLA DE VENTAS / FACTURAS
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number SERIAL UNIQUE,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_given NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA DE DETALLE DE VENTA (ITEMS)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_type VARCHAR(50) NOT NULL DEFAULT 'product', -- 'product', 'print_service'
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA DE GASTOS
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE MOVIMIENTOS DE STOCK
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('sale', 'restock', 'adjustment', 'cancel_sale', 'print_usage')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id UUID,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA DE TARIFAS DE IMPRESIÓN Y COPIAS
CREATE TABLE IF NOT EXISTS public.print_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL,
    paper_type VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    estimated_ink_ml NUMERIC(8, 3) NOT NULL DEFAULT 0.050,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(service_type, paper_type)
);

-- 7. TABLA DE REGISTROS DE IMPRESIÓN / CONSUMO OPERATIVO
CREATE TABLE IF NOT EXISTS public.print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    paper_type VARCHAR(20) NOT NULL,
    is_duplex BOOLEAN NOT NULL DEFAULT FALSE,
    pages_count INTEGER NOT NULL CHECK (pages_count > 0),
    sheets_used INTEGER NOT NULL CHECK (sheets_used > 0),
    ink_used_estimate NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEED DE TARIFAS OFICIALES EN CÓRDOBAS (C$)
INSERT INTO public.print_rates (service_type, paper_type, name, sale_price, cost_price, estimated_ink_ml)
VALUES 
    ('print_bn', 'carta', 'Impresión B/N Carta', 4.00, 1.00, 0.050),
    ('print_bn', 'legal', 'Impresión B/N Legal', 5.00, 1.25, 0.060),
    ('print_color', 'carta', 'Impresión Color Carta', 8.00, 2.50, 0.150),
    ('print_color', 'legal', 'Impresión Color Legal', 10.00, 3.00, 0.180),
    ('copy_bn', 'carta', 'Copia B/N Carta', 4.00, 0.80, 0.040),
    ('copy_bn', 'legal', 'Copia B/N Legal', 5.00, 1.00, 0.050),
    ('copy_color', 'carta', 'Copia Color Carta', 8.00, 2.50, 0.120),
    ('copy_color', 'legal', 'Copia Color Legal', 10.00, 3.00, 0.150)
ON CONFLICT (service_type, paper_type) DO UPDATE SET
    sale_price = EXCLUDED.sale_price,
    cost_price = EXCLUDED.cost_price;

-- PRODUCTOS BASE DE PAPEL (SI NO EXISTEN)
INSERT INTO public.products (name, description, cost_price, sale_price, stock, min_stock, units_deducted_per_sale)
VALUES
    ('Hojas de Papel Carta', 'Papel bond tamaño carta (consumo impresiones y menudeo)', 0.50, 1.00, 500, 50, 1),
    ('Hojas de Papel Legal', 'Papel bond tamaño legal/oficio (consumo impresiones y menudeo)', 0.60, 1.50, 300, 30, 1),
    ('3 Hojas Carta x C$2', 'Venta menudiada de 3 hojas carta por 2 córdobas', 0.60, 2.00, 500, 50, 3)
ON CONFLICT DO NOTHING;

-- INDICES
CREATE INDEX IF NOT EXISTS idx_print_logs_created_at ON public.print_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_print_logs_sale_id ON public.print_logs(sale_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_service_type ON public.print_logs(service_type);

-- POLÍTICAS RLS PÚBLICAS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access products" ON public.products;
CREATE POLICY "Public full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access sales" ON public.sales;
CREATE POLICY "Public full access sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access sale_items" ON public.sale_items;
CREATE POLICY "Public full access sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access expenses" ON public.expenses;
CREATE POLICY "Public full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access stock_movements" ON public.stock_movements;
CREATE POLICY "Public full access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access print_rates" ON public.print_rates;
CREATE POLICY "Public full access print_rates" ON public.print_rates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access print_logs" ON public.print_logs;
CREATE POLICY "Public full access print_logs" ON public.print_logs FOR ALL USING (true) WITH CHECK (true);
