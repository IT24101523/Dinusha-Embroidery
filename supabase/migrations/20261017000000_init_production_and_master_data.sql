-- Migration: 20261017000000_init_production_and_master_data.sql
-- Description: Initialize Authentication, Master Data (Companies, Machines, Styles, Parts, Threads), and Production Plans with RLS policies and Seed Data

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CEO', 'FACTORY_MANAGER', 'HR_NEEDLE_MANAGER', 'PRODUCTION_MANAGER', 'QUALITY_MANAGER')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Machines Table
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    machine_number INTEGER NOT NULL,
    heads INTEGER NOT NULL DEFAULT 15,
    speed_spm INTEGER NOT NULL DEFAULT 1000,
    brand TEXT NOT NULL DEFAULT 'Tajima',
    embroidery_types JSONB NOT NULL DEFAULT '["Normal"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    current_operator TEXT DEFAULT 'Nimal',
    current_helper TEXT DEFAULT 'Priyanta',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Styles Table
CREATE TABLE IF NOT EXISTS styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    name TEXT NOT NULL,
    fabric_color TEXT NOT NULL DEFAULT 'White',
    target_per_hour INTEGER NOT NULL DEFAULT 20,
    currency TEXT NOT NULL DEFAULT 'LKR',
    price NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    order_qty INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Style Parts Table
CREATE TABLE IF NOT EXISTS style_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    part_qty INTEGER NOT NULL DEFAULT 1,
    backing TEXT NOT NULL DEFAULT 'Tearaway (Standard)',
    needle_spec TEXT NOT NULL DEFAULT 'DBxK5 75/11',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Style Threads Table
CREATE TABLE IF NOT EXISTS style_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES style_parts(id) ON DELETE CASCADE,
    color TEXT NOT NULL,
    shade TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT 'Madeira',
    machine_len_meters NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cone_size_meters NUMERIC(10, 2) NOT NULL DEFAULT 5000,
    required_cones NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Production Plans Table
CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_date DATE NOT NULL,
    shift TEXT NOT NULL DEFAULT 'day',
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    style_name TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT 'L',
    start_time TEXT NOT NULL DEFAULT '08:00',
    end_time TEXT NOT NULL DEFAULT '18:00',
    start_col INTEGER NOT NULL DEFAULT 1,
    span INTEGER NOT NULL DEFAULT 11,
    plan_qty INTEGER NOT NULL DEFAULT 300,
    actual_qty INTEGER NOT NULL DEFAULT 0,
    operator TEXT NOT NULL DEFAULT 'Nimal',
    helper TEXT NOT NULL DEFAULT 'Priyanta',
    status TEXT NOT NULL DEFAULT 'RUNNING',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

-- 9. Idempotent Policies
DROP POLICY IF EXISTS "Allow all for anon and authenticated on users" ON users;
CREATE POLICY "Allow all for anon and authenticated on users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on companies" ON companies;
CREATE POLICY "Allow all for anon and authenticated on companies" ON companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on machines" ON machines;
CREATE POLICY "Allow all for anon and authenticated on machines" ON machines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on styles" ON styles;
CREATE POLICY "Allow all for anon and authenticated on styles" ON styles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on style_parts" ON style_parts;
CREATE POLICY "Allow all for anon and authenticated on style_parts" ON style_parts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on style_threads" ON style_threads;
CREATE POLICY "Allow all for anon and authenticated on style_threads" ON style_threads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon and authenticated on production_plans" ON production_plans;
CREATE POLICY "Allow all for anon and authenticated on production_plans" ON production_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
