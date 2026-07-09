-- Insert admin user (hanya jika belum ada)
INSERT INTO users (id, username, password, role, nama, created_at)
SELECT 'u_admin', 'admin', '354', 'admin', 'Administrator Koperasi', NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'u_admin');
