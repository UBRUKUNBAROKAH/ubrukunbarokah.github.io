-- ============================================================
-- UB RUKUN BAROKAH - Full Database Schema
-- Jalankan di Supabase Dashboard -> SQL Editor
-- users = akun login, anggota = data anggota (nasabah)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','koordinator','nasabah')),
  nama TEXT NOT NULL,
  anggota_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS anggota (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  nik TEXT,
  alamat TEXT,
  no_hp TEXT,
  kelompok_id TEXT,
  no_rekening TEXT,
  saham JSONB DEFAULT '{}',
  status TEXT DEFAULT 'aktif',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS kelompok (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  koor_id TEXT
);

CREATE TABLE IF NOT EXISTS jenis_tabungan (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  wajib_minimal NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jenis_saham (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  nominal_per_lembar NUMERIC NOT NULL,
  shu_persen NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tabungan_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jenis_id TEXT NOT NULL,
  saldo NUMERIC DEFAULT 0,
  no_rekening TEXT
);

CREATE TABLE IF NOT EXISTS tabungan_tx (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jenis_id TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('setor','tarik')),
  jumlah NUMERIC NOT NULL,
  saldo_setelah NUMERIC,
  tanggal TEXT,
  oleh TEXT,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS pembiayaan (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jumlah_pinjaman NUMERIC NOT NULL,
  tenor INTEGER NOT NULL,
  margin_persen NUMERIC DEFAULT 0,
  margin_max NUMERIC,
  angsuran_per_bulan NUMERIC,
  sisa_angsuran INTEGER DEFAULT 0,
  status TEXT DEFAULT 'berjalan' CHECK (status IN ('berjalan','lunas','macet')),
  status_pengajuan TEXT DEFAULT 'pending' CHECK (status_pengajuan IN ('pending','disetujui','ditolak')),
  keterangan TEXT,
  mulai TEXT,
  riwayat_angsuran JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS angsuran (
  id TEXT PRIMARY KEY,
  pembiayaan_id TEXT NOT NULL,
  angsuran_ke INTEGER NOT NULL,
  jumlah NUMERIC NOT NULL,
  tanggal TEXT,
  status TEXT DEFAULT 'lunas'
);

CREATE TABLE IF NOT EXISTS kepemilikan_saham (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  anggota_id TEXT,
  jenis_id TEXT NOT NULL,
  lembar INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS setoran (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jenis_id TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  keterangan TEXT,
  tanggal TEXT,
  dibuat_oleh TEXT,
  status TEXT DEFAULT 'di_koordinator' CHECK (status IN ('di_koordinator','sudah_di_admin')),
  dikonfirmasi_oleh TEXT,
  waktu_konfirmasi TEXT
);

CREATE TABLE IF NOT EXISTS pengaturan_koperasi (
  id TEXT PRIMARY KEY DEFAULT 'koperasi',
  nama TEXT,
  icon TEXT,
  icon_image TEXT,
  info JSONB DEFAULT '{}',
  sertifikat JSONB DEFAULT '{}',
  saham JSONB DEFAULT '{}',
  atur_keuangan JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  aksi TEXT NOT NULL,
  detail TEXT,
  waktu TEXT,
  oleh TEXT,
  peran TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS: aktifkan & izinkan anon key baca/tulis semua tabel
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelompok ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_tabungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_saham ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabungan_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabungan_tx ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembiayaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE angsuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kepemilikan_saham ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan_koperasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk masing-masing tabel (drop dulu biar idempotent)
DROP POLICY IF EXISTS "anon_select_users" ON users;
DROP POLICY IF EXISTS "anon_insert_users" ON users;
DROP POLICY IF EXISTS "anon_update_users" ON users;
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT USING (true);
CREATE POLICY "anon_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_users" ON users FOR UPDATE USING (true);
CREATE POLICY "anon_delete_users" ON users FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_kelompok" ON kelompok;
DROP POLICY IF EXISTS "anon_insert_kelompok" ON kelompok;
DROP POLICY IF EXISTS "anon_update_kelompok" ON kelompok;
DROP POLICY IF EXISTS "anon_delete_kelompok" ON kelompok;
CREATE POLICY "anon_select_kelompok" ON kelompok FOR SELECT USING (true);
CREATE POLICY "anon_insert_kelompok" ON kelompok FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_kelompok" ON kelompok FOR UPDATE USING (true);
CREATE POLICY "anon_delete_kelompok" ON kelompok FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_jenis_tabungan" ON jenis_tabungan;
DROP POLICY IF EXISTS "anon_insert_jenis_tabungan" ON jenis_tabungan;
DROP POLICY IF EXISTS "anon_update_jenis_tabungan" ON jenis_tabungan;
DROP POLICY IF EXISTS "anon_delete_jenis_tabungan" ON jenis_tabungan;
CREATE POLICY "anon_select_jenis_tabungan" ON jenis_tabungan FOR SELECT USING (true);
CREATE POLICY "anon_insert_jenis_tabungan" ON jenis_tabungan FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_jenis_tabungan" ON jenis_tabungan FOR UPDATE USING (true);
CREATE POLICY "anon_delete_jenis_tabungan" ON jenis_tabungan FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_jenis_saham" ON jenis_saham;
DROP POLICY IF EXISTS "anon_insert_jenis_saham" ON jenis_saham;
DROP POLICY IF EXISTS "anon_update_jenis_saham" ON jenis_saham;
DROP POLICY IF EXISTS "anon_delete_jenis_saham" ON jenis_saham;
CREATE POLICY "anon_select_jenis_saham" ON jenis_saham FOR SELECT USING (true);
CREATE POLICY "anon_insert_jenis_saham" ON jenis_saham FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_jenis_saham" ON jenis_saham FOR UPDATE USING (true);
CREATE POLICY "anon_delete_jenis_saham" ON jenis_saham FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_tabungan_accounts" ON tabungan_accounts;
DROP POLICY IF EXISTS "anon_insert_tabungan_accounts" ON tabungan_accounts;
DROP POLICY IF EXISTS "anon_update_tabungan_accounts" ON tabungan_accounts;
DROP POLICY IF EXISTS "anon_delete_tabungan_accounts" ON tabungan_accounts;
CREATE POLICY "anon_select_tabungan_accounts" ON tabungan_accounts FOR SELECT USING (true);
CREATE POLICY "anon_insert_tabungan_accounts" ON tabungan_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_tabungan_accounts" ON tabungan_accounts FOR UPDATE USING (true);
CREATE POLICY "anon_delete_tabungan_accounts" ON tabungan_accounts FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_tabungan_tx" ON tabungan_tx;
DROP POLICY IF EXISTS "anon_insert_tabungan_tx" ON tabungan_tx;
DROP POLICY IF EXISTS "anon_update_tabungan_tx" ON tabungan_tx;
DROP POLICY IF EXISTS "anon_delete_tabungan_tx" ON tabungan_tx;
CREATE POLICY "anon_select_tabungan_tx" ON tabungan_tx FOR SELECT USING (true);
CREATE POLICY "anon_insert_tabungan_tx" ON tabungan_tx FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_tabungan_tx" ON tabungan_tx FOR UPDATE USING (true);
CREATE POLICY "anon_delete_tabungan_tx" ON tabungan_tx FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_pembiayaan" ON pembiayaan;
DROP POLICY IF EXISTS "anon_insert_pembiayaan" ON pembiayaan;
DROP POLICY IF EXISTS "anon_update_pembiayaan" ON pembiayaan;
DROP POLICY IF EXISTS "anon_delete_pembiayaan" ON pembiayaan;
CREATE POLICY "anon_select_pembiayaan" ON pembiayaan FOR SELECT USING (true);
CREATE POLICY "anon_insert_pembiayaan" ON pembiayaan FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_pembiayaan" ON pembiayaan FOR UPDATE USING (true);
CREATE POLICY "anon_delete_pembiayaan" ON pembiayaan FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_angsuran" ON angsuran;
DROP POLICY IF EXISTS "anon_insert_angsuran" ON angsuran;
DROP POLICY IF EXISTS "anon_update_angsuran" ON angsuran;
DROP POLICY IF EXISTS "anon_delete_angsuran" ON angsuran;
CREATE POLICY "anon_select_angsuran" ON angsuran FOR SELECT USING (true);
CREATE POLICY "anon_insert_angsuran" ON angsuran FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_angsuran" ON angsuran FOR UPDATE USING (true);
CREATE POLICY "anon_delete_angsuran" ON angsuran FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_kepemilikan_saham" ON kepemilikan_saham;
DROP POLICY IF EXISTS "anon_insert_kepemilikan_saham" ON kepemilikan_saham;
DROP POLICY IF EXISTS "anon_update_kepemilikan_saham" ON kepemilikan_saham;
DROP POLICY IF EXISTS "anon_delete_kepemilikan_saham" ON kepemilikan_saham;
CREATE POLICY "anon_select_kepemilikan_saham" ON kepemilikan_saham FOR SELECT USING (true);
CREATE POLICY "anon_insert_kepemilikan_saham" ON kepemilikan_saham FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_kepemilikan_saham" ON kepemilikan_saham FOR UPDATE USING (true);
CREATE POLICY "anon_delete_kepemilikan_saham" ON kepemilikan_saham FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_setoran" ON setoran;
DROP POLICY IF EXISTS "anon_insert_setoran" ON setoran;
DROP POLICY IF EXISTS "anon_update_setoran" ON setoran;
DROP POLICY IF EXISTS "anon_delete_setoran" ON setoran;
CREATE POLICY "anon_select_setoran" ON setoran FOR SELECT USING (true);
CREATE POLICY "anon_insert_setoran" ON setoran FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_setoran" ON setoran FOR UPDATE USING (true);
CREATE POLICY "anon_delete_setoran" ON setoran FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_pengaturan_koperasi" ON pengaturan_koperasi;
DROP POLICY IF EXISTS "anon_insert_pengaturan_koperasi" ON pengaturan_koperasi;
DROP POLICY IF EXISTS "anon_update_pengaturan_koperasi" ON pengaturan_koperasi;
DROP POLICY IF EXISTS "anon_delete_pengaturan_koperasi" ON pengaturan_koperasi;
CREATE POLICY "anon_select_pengaturan_koperasi" ON pengaturan_koperasi FOR SELECT USING (true);
CREATE POLICY "anon_insert_pengaturan_koperasi" ON pengaturan_koperasi FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_pengaturan_koperasi" ON pengaturan_koperasi FOR UPDATE USING (true);
CREATE POLICY "anon_delete_pengaturan_koperasi" ON pengaturan_koperasi FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon_select_logs" ON logs;
DROP POLICY IF EXISTS "anon_insert_logs" ON logs;
DROP POLICY IF EXISTS "anon_update_logs" ON logs;
DROP POLICY IF EXISTS "anon_delete_logs" ON logs;
CREATE POLICY "anon_select_logs" ON logs FOR SELECT USING (true);
CREATE POLICY "anon_insert_logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_logs" ON logs FOR UPDATE USING (true);
CREATE POLICY "anon_delete_logs" ON logs FOR DELETE USING (true);

-- Anggota
DROP POLICY IF EXISTS "anon_select_anggota" ON anggota;
DROP POLICY IF EXISTS "anon_insert_anggota" ON anggota;
DROP POLICY IF EXISTS "anon_update_anggota" ON anggota;
DROP POLICY IF EXISTS "anon_delete_anggota" ON anggota;
CREATE POLICY "anon_select_anggota" ON anggota FOR SELECT USING (true);
CREATE POLICY "anon_insert_anggota" ON anggota FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_anggota" ON anggota FOR UPDATE USING (true);
CREATE POLICY "anon_delete_anggota" ON anggota FOR DELETE USING (true);
