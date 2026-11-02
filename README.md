# UB Rukun Barokah — Aplikasi Manajemen Koperasi Syariah

Aplikasi manajemen koperasi syariah berbasis web untuk pengelolaan simpanan, pembiayaan, saham, dan bagi hasil.

## Fitur Utama
- **Multi-role**: Admin, Koordinator, Nasabah
- **Simpanan**: setor, tarik, transfer antar rekening/nasabah, buku tabungan
- **Pembiayaan**: pengajuan, persetujuan, angsuran, bayar dari saldo tabungan, surat SP, piutang bermasalah
- **Saham**: kepemilikan, pemupukan nilai, sertifikat A4
- **Laporan**: ikhtisar, neraca, laba/rugi, laporan ringkas, log transaksi
- **Notifikasi WhatsApp** melalui Supabase Edge Function `wa-notif`
- **PWA**: dapat dipasang di HP (manifest + service worker)
- **Responsive**: tampilan mobile (nav bawah) & desktop (sidebar)

## Akses
Aplikasi online: **https://ubrukunbarokah.github.io/**

## Teknologi
- Single-file HTML + JavaScript (tanpa build step)
- **Supabase** (Postgres + REST) sebagai database online
- Pustaka browser: jsPDF, jsPDF-AutoTable, SheetJS, ExcelJS, html2canvas
- Service worker untuk caching app shell

## Struktur Singkat
| File | Keterangan |
|---|---|
| `index.html` | Seluruh aplikasi (UI, logika, akses Supabase) |
| `sw.js` | Service worker (cache app shell) |
| `manifest.json` | Manifest PWA |
| `supabase_schema.sql` | Skema database Supabase |
| `supabase/functions/` | Edge Functions (notifikasi WhatsApp) |

## Catatan Keamanan
- Kredensial akun pengguna dikelola di tabel `users` Supabase.
- Jangan menyimpan token/API key di file yang di-commit. Token notifikasi disimpan sebagai secret di Supabase Edge Function.
- Ganti password default sebelum aplikasi dipakai produksi.

---
*Dikembangkan untuk UB Rukun Barokah*
