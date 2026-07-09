-- Supabase Migration: perbaiki kolom dan constraint untuk aplikasi terbaru
-- Jalankan sekali di Supabase SQL Editor

-- ============================================================
-- 1. LOGS: hapus kolom lama "aktivitas", pakai "aksi"
-- ============================================================
ALTER TABLE logs DROP COLUMN IF EXISTS aktivitas;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS aksi TEXT NOT NULL DEFAULT '';
ALTER TABLE logs ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS waktu TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS oleh TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS peran TEXT;

-- ============================================================
-- 2. SETORAN: drop old check constraint, buat baru
-- ============================================================
ALTER TABLE setoran DROP CONSTRAINT IF EXISTS setoran_status_check;
ALTER TABLE setoran ADD CHECK (status IN ('di_koordinator','sudah_di_admin'));
ALTER TABLE setoran ADD COLUMN IF NOT EXISTS dikonfirmasi_oleh TEXT;
ALTER TABLE setoran ADD COLUMN IF NOT EXISTS waktu_konfirmasi TEXT;
ALTER TABLE setoran ADD COLUMN IF NOT EXISTS dibuat_oleh TEXT;

-- ============================================================
-- 3. PENGATURAN_KOPERASI: tambah kolom JSONB
-- ============================================================
ALTER TABLE pengaturan_koperasi ADD COLUMN IF NOT EXISTS atur_keuangan JSONB DEFAULT '{}';
ALTER TABLE pengaturan_koperasi ADD COLUMN IF NOT EXISTS saham JSONB DEFAULT '{}';
ALTER TABLE pengaturan_koperasi ADD COLUMN IF NOT EXISTS sertifikat JSONB DEFAULT '{}';
ALTER TABLE pengaturan_koperasi ADD COLUMN IF NOT EXISTS info JSONB DEFAULT '{}';
ALTER TABLE pengaturan_koperasi ADD COLUMN IF NOT EXISTS icon_image TEXT;

-- ============================================================
-- 4. USERS: tambah kolom relasi ke anggota
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS anggota_id TEXT;

-- ============================================================
-- 5. ANGGOTA: tambah kolom
-- ============================================================
ALTER TABLE anggota ADD COLUMN IF NOT EXISTS kelompok_id TEXT;
ALTER TABLE anggota ADD COLUMN IF NOT EXISTS no_rekening TEXT;
ALTER TABLE anggota ADD COLUMN IF NOT EXISTS saham JSONB DEFAULT '{}';
ALTER TABLE anggota ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
