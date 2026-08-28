import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_TOKEN') || '8652500654:AAEc9-q1ZuwjP2FuxR2jIPNlyAdY65cSEVA'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getInfo(): Promise<any> {
  const { data, error } = await supabase
    .from('pengaturan_koperasi')
    .select('info')
    .eq('id', 'koperasi')
    .single()
  if (error) throw new Error('gagal baca info: ' + (error.message || 'unknown'))
  return (data && data.info) || {}
}

async function setInfo(info: any) {
  const { error } = await supabase
    .from('pengaturan_koperasi')
    .update({ info })
    .eq('id', 'koperasi')
  if (error) throw new Error('gagal simpan info: ' + (error.message || 'unknown'))
}

function tgApi(method: string, params: Record<string, unknown>) {
  return fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).then((r) => r.json())
}

async function saveLink(userId: string, chatId: string | number) {
  const info = await getInfo()
  if (!info.telegramLinks) info.telegramLinks = {}
  info.telegramLinks[userId] = String(chatId)
  await setInfo(info)
  return info
}

async function handleUpdate(update: any) {
  const msg = update.message
  if (!msg || !msg.chat || !msg.text) return
  const m = String(msg.text).trim().match(/^\/start\s+u_(.+)$/)
  if (m) {
    await saveLink(decodeURIComponent(m[1]), msg.chat.id)
  }
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'hook'

  try {
    if (action === 'setwebhook') {
      const hookUrl = SUPABASE_URL + '/functions/v1/telegram?action=hook'
      const r = await tgApi('setWebhook', { url: hookUrl })
      return json({ ok: true, telegram: r })
    }

    if (action === 'hook') {
      const body = await req.json().catch(() => ({}))
      await handleUpdate(body).catch((e) => console.error('hook error', e))
      return json({ ok: true })
    }

    if (action === 'send') {
      const body = await req.json().catch(() => ({}))
      const chatId = body.chatId || body.chat_id || body.chat
      const text = body.text
      if (!chatId || !text) return json({ ok: false, msg: 'chatId & text wajib diisi' }, 400)
      const r: any = await tgApi('sendMessage', {
        chat_id: String(chatId),
        text: String(text),
        disable_web_page_preview: true,
      })
      return json({ ok: !!r.ok, telegram: r })
    }

    if (action === 'refresh') {
      const info = await getInfo()
      return json({ ok: true, telegramLinks: info.telegramLinks || {} })
    }

    return json({ ok: false, msg: 'action tidak dikenal' }, 400)
  } catch (e) {
    return json({ ok: false, msg: 'error', detail: String(e) }, 500)
  }
}

Deno.serve(handler)
