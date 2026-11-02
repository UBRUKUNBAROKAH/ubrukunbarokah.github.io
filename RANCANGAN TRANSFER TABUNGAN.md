# Fitur: Transfer Tabungan & Bayar Pembiayaan dari Tabungan

Status: **Sudah diimplementasi** sejak 16 September 2026 (commit `747020c`), dengan
perbaikan tampilan transfer masuk pada commit `5381d35`.

Dokumen ini semula berupa rancangan. Bagian "Rancangan awal" dipertahankan sebagai
acuan, sedangkan bagian "Realisasi" menjelaskan kondisi kode saat ini.

## Tujuan
Nasabah bisa memindahkan saldo tabungan tanpa uang keluar dari kas koperasi:
1. Antar jenis rekening milik sendiri (mis. Simpanan Wajib → Simpanan Berjangka).
2. Ke rekening nasabah lain di seluruh koperasi.
3. Bayar pembiayaan (angsuran SP) memakai saldo tabungan.

## Realisasi di kode (`index.html`)

### Transfer tabungan
- Tombol **Transfer** tersedia di:
  - Beranda nasabah (`openTransferModal()`)
  - Menu Tabungan admin/koordinator
  - Detail rekening nasabah
- Dua mode tujuan:
  - **Rekening sendiri** → pilih jenis rekening tujuan.
  - **Ke nasabah lain** → ketik nomor rekening, sistem mencari dan memvalidasi
    pemilik serta jenis rekeningnya (`transferLookupTujuan()`).
- Validasi:
  - Rekening asal dan tujuan harus ada dan **aktif**.
  - Nominal wajib > 0 dan **tidak boleh melebihi saldo** rekening asal.
  - Rekening asal dan tujuan tidak boleh sama.
  - Tanggal transaksi bisa diisi tanggal lampau (tidak boleh masa depan).
- Efek:
  - Saldo rekening asal berkurang, rekening tujuan bertambah.
  - Dua baris riwayat: `transfer_keluar` (asal) dan `transfer_masuk` (tujuan),
    masing-masing menyimpan saldo setelah transaksi dan siapa yang menginput (`oleh`).
  - Masuk **Log Transaksi** dengan aksi "Transfer tabungan".
  - Notifikasi WhatsApp ke pemilik rekening asal dan tujuan.
  - Badge/ikon khusus transfer pada riwayat tabungan.

Fungsi utama: `openTransferModal()`, `confirmTransfer()`, `prosesTransfer()`.

### Bayar pembiayaan dari tabungan
- Tombol **Bayar Pembiayaan** tersedia di beranda nasabah dan detail pembiayaan.
- Alur: pilih pembiayaan → pilih rekening tabungan sumber → isi nominal bebas
  (tidak harus tepat satu angsuran, boleh lebih besar).
- Saldo tabungan langsung berkurang dan tercatat sebagai transaksi `bayar_sp`
  beserta nomor akad dan angsuran ke-berapa.
- Angsuran masuk alur pembiayaan yang sama seperti pembayaran tunai, lengkap dengan
  notifikasi WhatsApp.

Fungsi utama: `openBayarSPModal()`, `confirmBayarSP()`, `prosesBayarSP()`.

## Hak akses
- **Nasabah** → hanya rekening miliknya sendiri.
- **Koordinator** → anggota kelompoknya.
- **Admin** → semua nasabah.

## Catatan / penyempurnaan yang masih mungkin
- `prosesBayarSP()` memakai waktu input (`nowISO()`), bukan tanggal pilihan seperti
  transfer. Jika perlu mencatat pembayaran lampau, tambahkan input tanggal.
- Belum ada batas maksimal nominal transfer selain saldo.
- Notifikasi WhatsApp bergantung pada Edge Function `wa-notif` dan konfigurasi nomor admin.
