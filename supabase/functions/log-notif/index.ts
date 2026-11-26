// Edge Function: meneruskan log aktivitas aplikasi ke grup Telegram.
// Token bot & chat ID TIDAK pernah dikirim dari browser — dibaca dari Secret Supabase.
//
// Secrets yang diperlukan:
//   TELEGRAM_BOT_TOKEN  = token bot baru dari @BotFather
//   TELEGRAM_CHAT_ID    = ID grup log (biasanya diawali -100...)
//   SUPABASE_ANON_KEY   = anon key project (untuk membatasi request liar)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Login/logout tidak perlu membanjiri grup log.
const SKIP_AKSI = new Set(['Masuk aplikasi', 'Keluar aplikasi']);

const rateMap = new Map<string, number[]>();
const seenMap = new Map<string, number>();

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
  if (recent.length >= 60) {
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

function sudahTerkirim(id: string): boolean {
  const now = Date.now();
  for (const [key, at] of seenMap) if (now - at > 10 * 60_000) seenMap.delete(key);
  if (seenMap.has(id)) return true;
  seenMap.set(id, now);
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method tidak diizinkan' }, 405);

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');

  if (!token || !chatId) {
    return json({ error: 'Secret TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi' }, 500);
  }
  const apikey = req.headers.get('apikey') || '';
  const auth = req.headers.get('authorization') || '';
  const dariAuth = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (anon && !kunciAnonValid(apikey) && !kunciAnonValid(dariAuth)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON tidak valid' }, 400);
  }
  if (!payload || typeof payload !== 'object') return json({ error: 'Payload tidak valid' }, 400);

  if (SKIP_AKSI.has(String(payload.aksi || ''))) {
    return json({ success: true, skipped: 'login/logout' });
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!izinkan(ip)) return json({ error: 'Terlalu banyak request, coba lagi sebentar' }, 429);

  if (payload.id && sudahTerkirim(String(payload.id))) {
    return json({ success: true, skipped: 'duplicate' });
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatPesan(payload),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const tgData = await tgRes.json().catch(() => ({}));

  if (!tgRes.ok || !tgData.ok) {
    console.error('Telegram API error', tgRes.status, tgData);
    return json(
      { success: false, error: tgData.description || 'Gagal mengirim ke Telegram', http: tgRes.status },
      502,
    );
  }

  return json({ success: true, message_id: tgData.result?.message_id });
});
