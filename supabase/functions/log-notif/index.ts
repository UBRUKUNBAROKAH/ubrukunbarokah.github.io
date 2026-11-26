// Edge Function: meneruskan log aktivitas aplikasi ke grup Telegram.
// Token bot & chat ID TIDAK pernah dikirim dari browser — dibaca dari Secret Supabase.
//
// Secrets yang diperlukan:
//   TELEGRAM_BOT_TOKEN         = token bot dari @BotFather
//   TELEGRAM_CHAT_ID           = ID grup log (biasanya diawali -100...)
//   SUPABASE_URL               = otomatis tersedia di Edge Function
//   SUPABASE_SERVICE_ROLE_KEY  = otomatis tersedia, dipakai membaca/mengubah tabel logs
//
// Mode:
//   { "mode": "sync", "limit": 10 }  -> ambil antrean dari tabel logs lalu kirim
//   { "aksi": "...", "detail": "..." } -> kirim satu pesan langsung (tombol tes)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Login/logout tidak perlu membanjiri grup log.
const SKIP_AKSI = new Set(['Masuk aplikasi', 'Keluar aplikasi']);
const MAX_ATTEMPTS = 10;
const CLAIM_TIMEOUT_MS = 5 * 60_000;

const rateMap = new Map<string, number[]>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bersihkanDetail(v: unknown): string {
  return String(v ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function formatWaktu(v: unknown): string {
  const d = v ? new Date(String(v)) : new Date();
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function formatPesan(p: Record<string, unknown>): string {
  const lines = [
    '<b>UB Rukun Barokah · Log aktivitas</b>',
    '🕐 <code>' + esc(formatWaktu(p.waktu)) + ' WIB</code>',
    '👤 ' + esc(p.olehNama || p.oleh || 'system') + ' · <i>' + esc(p.peran || '-') + '</i>',
    '📌 <b>' + esc(p.aksi || '-') + '</b>',
  ];
  const detail = bersihkanDetail(p.detail);
  if (detail) lines.push('📝 ' + esc(detail));

  let text = lines.join('\n');
  if (text.length > 3800) text = text.slice(0, 3797) + '…';
  return text;
}

function izinkan(ip: string): boolean {
  const now = Date.now();
  const recent = (rateMap.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 90) {
    rateMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateMap.set(ip, recent);
  if (rateMap.size > 2000) {
    for (const [key, times] of rateMap) {
      if (!times.length || now - times[times.length - 1] > 60_000) rateMap.delete(key);
    }
  }
  return true;
}

function kunciAnonValid(kunci: string): boolean {
  if (!kunci) return false;
  const kandidat = [
    Deno.env.get('SUPABASE_ANON_KEY'),
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY'),
  ].filter(Boolean) as string[];
  if (kandidat.includes(kunci)) return true;
  // Key baru formatnya sb_publishable_..., key lama berupa JWT dengan role "anon".
  if (kunci.startsWith('sb_publishable_')) return true;
  const bagian = kunci.split('.');
  if (bagian.length === 3) {
    try {
      const isi = atob(bagian[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(isi);
      return payload && payload.role === 'anon';
    } catch {
      return false;
    }
  }
  return false;
}

function kredensialSupabase(): { url: string; key: string } {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum tersedia');
  return { url: url.replace(/\/$/, ''), key };
}

async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { url, key } = kredensialSupabase();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const teks = await res.text();
  let data: unknown = null;
  try {
    data = teks ? JSON.parse(teks) : null;
  } catch {
    data = teks;
  }
  if (!res.ok) {
    throw new Error(`REST ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function patchLog(filter: string, body: Record<string, unknown>): Promise<unknown> {
  return rest(`logs?${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
}

async function kirimTelegram(teks: string): Promise<Record<string, unknown>> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    throw new Error('Secret TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi');
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: teks,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram HTTP ${res.status}`);
  }
  return data.result || {};
}

async function namaPengguna(ids: string[]): Promise<Map<string, string>> {
  const unik = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unik.length) return map;
  const filter = unik.map((id) => encodeURIComponent(id)).join(',');
  const rows = await rest(`users?select=id,nama&id=in.(${filter})`);
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (r && r.id) map.set(String(r.id), String(r.nama || ''));
    }
  }
  return map;
}

async function prosesAntrean(limit: number): Promise<Record<string, unknown>[]> {
  // Kembalikan klaim yang macet (mis. function mati di tengah pengiriman).
  try {
    const batas = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
    await patchLog(
      `telegram_status=eq.sending&telegram_claimed_at=lt.${encodeURIComponent(batas)}`,
      { telegram_status: 'failed', telegram_error: 'Klaim timeout, dicoba ulang', telegram_claimed_at: null },
    );
  } catch (e) {
    console.warn('Recovery klaim gagal:', e);
  }

  const rows = await rest(
    `logs?select=id,waktu,oleh,peran,aksi,detail,telegram_status,telegram_attempts` +
      `&or=(telegram_status.eq.pending,telegram_status.eq.failed)` +
      `&telegram_attempts=lt.${MAX_ATTEMPTS}` +
      `&order=created_at.asc&limit=${limit}`,
  );
  if (!Array.isArray(rows) || !rows.length) return [];

  const namaMap = await namaPengguna(rows.map((r) => String(r.oleh || '')));
  const hasil: Record<string, unknown>[] = [];

  for (const row of rows) {
    const id = String(row.id);
    const aksi = String(row.aksi || '');
    const statusLama = String(row.telegram_status || 'pending');
    const attempt = Number(row.telegram_attempts) || 0;
    const idFilter = encodeURIComponent(id);

    if (SKIP_AKSI.has(aksi)) {
      const sentAt = new Date().toISOString();
      await patchLog(`id=eq.${idFilter}`, {
        telegram_status: 'skipped',
        telegram_sent_at: sentAt,
        telegram_error: null,
        telegram_claimed_at: null,
      });
      hasil.push({ id, status: 'skipped', attempts: attempt + 1, error: null, sentAt });
      continue;
    }

    // Klaim atomik: hanya satu pemanggil yang boleh memproses baris ini.
    const klaim = await patchLog(
      `id=eq.${idFilter}&telegram_status=eq.${encodeURIComponent(statusLama)}&telegram_attempts=eq.${attempt}`,
      {
        telegram_status: 'sending',
        telegram_attempts: attempt + 1,
        telegram_claimed_at: new Date().toISOString(),
      },
    );
    if (!Array.isArray(klaim) || !klaim.length) continue;

    try {
      await kirimTelegram(
        formatPesan({
          ...row,
          olehNama: namaMap.get(String(row.oleh || '')) || row.oleh || 'system',
        }),
      );
      const sentAt = new Date().toISOString();
      await patchLog(`id=eq.${idFilter}`, {
        telegram_status: 'sent',
        telegram_sent_at: sentAt,
        telegram_error: null,
        telegram_claimed_at: null,
      });
      hasil.push({ id, status: 'sent', attempts: attempt + 1, error: null, sentAt });
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      await patchLog(`id=eq.${idFilter}`, {
        telegram_status: 'failed',
        telegram_error: pesan.slice(0, 500),
        telegram_claimed_at: null,
      });
      hasil.push({ id, status: 'failed', attempts: attempt + 1, error: pesan, sentAt: null });
    }

    // Beri jeda kecil agar tidak menabrak rate limit Telegram.
    await new Promise((r) => setTimeout(r, 120));
  }

  return hasil;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method tidak diizinkan' }, 405);

  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const apikey = req.headers.get('apikey') || '';
  const auth = req.headers.get('authorization') || '';
  const dariAuth = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (anon && !kunciAnonValid(apikey) && !kunciAnonValid(dariAuth)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!izinkan(ip)) return json({ error: 'Terlalu banyak request, coba lagi sebentar' }, 429);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  if (!payload || typeof payload !== 'object') return json({ error: 'Payload tidak valid' }, 400);

  // Mode sinkronisasi: baca antrean dari tabel logs, kirim, lalu tandai statusnya.
  if (payload.mode === 'sync') {
    const limit = Math.min(Math.max(Number(payload.limit) || 10, 1), 20);
    try {
      const results = await prosesAntrean(limit);
      return json({ success: true, mode: 'sync', processed: results.length, results });
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      console.error('Sync log gagal:', pesan);
      return json({ success: false, error: pesan }, 500);
    }
  }

  // Mode langsung (tombol tes / kirim manual satu log).
  if (!payload.aksi) return json({ error: 'Payload tidak valid' }, 400);
  if (SKIP_AKSI.has(String(payload.aksi))) {
    return json({ success: true, skipped: 'login/logout' });
  }

  try {
    const result = await kirimTelegram(formatPesan(payload));
    return json({ success: true, message_id: result.message_id });
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    return json({ success: false, error: pesan }, 502);
  }
});
