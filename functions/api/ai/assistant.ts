/// <reference types="@cloudflare/workers-types" />

// UClient AI assistant proxy.
//
// The game client (CAiAssistant) posts a natural-language request together with
// a catalog of the settings/binds it is allowed to change, and expects back:
//   { "reply": string, "commands": [{ "op": "set|bind|unbind", "command", "value" }] }
// The client re-validates every command against its own catalog, so this proxy
// only needs to translate intent into catalog-shaped commands.

interface Env {
  OPENAI_API_KEY?: string
  // Optional overrides (have sensible defaults).
  AI_ASSISTANT_MODEL?: string
  AI_ASSISTANT_ENDPOINT?: string
}

type ChatRole = 'user' | 'assistant'

interface HistoryItem {
  role?: ChatRole
  content?: string
}

interface AssistantRequest {
  message?: string
  locale?: string
  catalog?: unknown
  history?: HistoryItem[]
}

interface ProposedCommand {
  op: 'set' | 'bind' | 'unbind'
  command: string
  value: string
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MAX_MESSAGE_LEN = 500
const MAX_HISTORY = 8
const MAX_COMMANDS = 8

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...CORS_HEADERS,
    },
  })
}

function hasApiKey(env: Env): boolean {
  try {
    return typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.trim().length > 0
  } catch {
    return false
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'access-control-max-age': '86400' },
  })

/** Health check. Use `?diag=openai` or `?diag=chat` to probe OpenAI. */
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const base = {
    ok: true,
    configured: hasApiKey(env),
    model: (env.AI_ASSISTANT_MODEL || DEFAULT_MODEL).trim(),
  }

  const url = new URL(request.url)
  const diag = url.searchParams.get('diag')
  if (diag !== 'openai' && diag !== 'chat') {
    return json(base)
  }

  if (!hasApiKey(env)) {
    return json({ ...base, openai: { ok: false, error: 'OPENAI_API_KEY missing' } }, 503)
  }

  const apiKey = (env.OPENAI_API_KEY as string)
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
  const model = (env.AI_ASSISTANT_MODEL || DEFAULT_MODEL).trim()

  try {
    if (diag === 'openai') {
      const upstream = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      const text = await upstream.text()
      return json({
        ...base,
        openai: {
          ok: upstream.ok,
          status: upstream.status,
          body: text.replace(/\s+/g, ' ').slice(0, 240),
        },
      })
    }

    // Minimal chat/completions probe — same path the real assistant uses.
    const upstream = await fetch(DEFAULT_OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        max_tokens: 16,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(20000),
    })
    const text = await upstream.text()
    return json({
      ...base,
      chat: {
        ok: upstream.ok,
        status: upstream.status,
        body: text.replace(/\s+/g, ' ').slice(0, 320),
      },
    })
  } catch (err) {
    return json({
      ...base,
      openai: {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    })
  }
}

const SYSTEM_PROMPT = `You are the in-game assistant for a DDNet game client (UClient/BestClient).
Your only job is to translate the user's natural-language request into safe client commands, chosen strictly from the provided CATALOG.

Hard rules:
- You may ONLY change settings listed in catalog.settings (use their exact "command" field) and create/remove key binds using catalog.bind.
- Setting change: {"op":"set","command":<a settings[].command>,"value":<string>}. For bool settings use "0" or "1". For enum settings use one of that setting's values[].value (an empty string "" is a valid enum value when listed).
- Create a bind: {"op":"bind","command":<one of catalog.bind.keys>,"value":<action>} where the action begins with one of catalog.bind.allowed_actions. Examples: "+fire", "+hook", "emote 1", "say hello", "kill". You may chain actions with "; ".
- Remove a bind: {"op":"unbind","command":<a key>,"value":""}.
- NEVER invent settings, keys, or actions that are not present in the catalog. If the user asks for something outside the catalog, return an empty "commands" array and briefly say what is not supported.
- You may return multiple commands when the request implies several changes.
- "reply" MUST be written in the user's language (see locale). Keep it short, friendly, and describe what you are about to change.

Output: respond with a SINGLE JSON object ONLY (no markdown, no code fences), exactly of this shape:
{"reply": "<text>", "commands": [{"op":"set|bind|unbind","command":"...","value":"..."}]}`

function sanitizeCommands(raw: unknown): ProposedCommand[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ProposedCommand[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    const op = String(record.op ?? '').trim().toLowerCase()
    if (op !== 'set' && op !== 'bind' && op !== 'unbind') {
      continue
    }
    const command = String(record.command ?? '').trim()
    if (!command) {
      continue
    }
    let value = ''
    if (typeof record.value === 'string') {
      value = record.value
    } else if (typeof record.value === 'number' || typeof record.value === 'boolean') {
      value = String(record.value)
    }
    out.push({ op, command: command.slice(0, 64), value: value.slice(0, 255) })
    if (out.length >= MAX_COMMANDS) {
      break
    }
  }
  return out
}

function buildMessages(body: AssistantRequest) {
  const locale = (body.locale || 'en').slice(0, 16)
  const message = String(body.message || '').slice(0, MAX_MESSAGE_LEN)
  // Cap catalog size so a huge client payload cannot blow the Worker.
  let catalogJson = '{}'
  try {
    catalogJson = JSON.stringify(body.catalog ?? {})
    if (catalogJson.length > 24000) {
      catalogJson = catalogJson.slice(0, 24000)
    }
  } catch {
    catalogJson = '{}'
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: `locale=${locale}\nCATALOG:\n${catalogJson}` },
  ]

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []
  for (const item of history) {
    const role = item?.role === 'assistant' ? 'assistant' : 'user'
    const content = String(item?.content ?? '').slice(0, MAX_MESSAGE_LEN)
    if (content) {
      messages.push({ role, content })
    }
  }

  messages.push({ role: 'user', content: message })
  return messages
}

function parseModelJson(content: string): { reply?: unknown; commands?: unknown } | null {
  try {
    return JSON.parse(content) as { reply?: unknown; commands?: unknown }
  } catch {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start < 0 || end <= start) {
      return null
    }
    try {
      return JSON.parse(content.slice(start, end + 1)) as { reply?: unknown; commands?: unknown }
    } catch {
      return null
    }
  }
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!hasApiKey(env)) {
      // Non-200 so the client falls back to its local rule-based handler.
      return json(
        {
          reply: 'AI 서버에 OPENAI_API_KEY가 없습니다. Cloudflare Pages 환경변수에 키를 넣으세요.',
          commands: [],
        },
        503,
      )
    }

    let body: AssistantRequest
    try {
      body = (await request.json()) as AssistantRequest
    } catch {
      return json({ reply: 'invalid_json', commands: [] }, 400)
    }

    const message = String(body?.message || '').trim()
    if (!message) {
      return json({ reply: 'message_required', commands: [] }, 400)
    }

    // Local ping — verifies POST routing without calling OpenAI.
    if (message === '__ping__') {
      return json({ reply: 'pong', commands: [] })
    }

    const apiKey = (env.OPENAI_API_KEY as string)
      .trim()
      .replace(/^Bearer\s+/i, '')
      .replace(/^["']|["']$/g, '')
    const model = (env.AI_ASSISTANT_MODEL || DEFAULT_MODEL).trim()
    const endpoint = (env.AI_ASSISTANT_ENDPOINT || DEFAULT_OPENAI_ENDPOINT).trim()

    let upstream: Response
    try {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: buildMessages(body),
          temperature: 0.2,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20000),
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return json({ reply: `AI 서버에 연결하지 못했습니다: ${detail.slice(0, 120)}`, commands: [] }, 502)
    }

    const upstreamText = await upstream.text()
    if (!upstream.ok) {
      const detail = upstreamText.replace(/\s+/g, ' ').slice(0, 160)
      return json(
        {
          reply: `OpenAI 오류 (HTTP ${upstream.status})${detail ? `: ${detail}` : ''}`,
          commands: [],
        },
        502,
      )
    }

    let completion: {
      choices?: Array<{ message?: { content?: string } }>
    }
    try {
      completion = JSON.parse(upstreamText) as typeof completion
    } catch {
      return json({ reply: 'AI 응답을 해석하지 못했습니다.', commands: [] }, 502)
    }

    const content = completion?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return json({ reply: 'AI 응답이 비어 있습니다.', commands: [] }, 502)
    }

    const parsed = parseModelJson(content)
    if (!parsed) {
      return json({ reply: 'AI 응답 형식이 올바르지 않습니다.', commands: [] }, 502)
    }

    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim().slice(0, 480)
        : '요청을 처리했습니다.'
    const commands = sanitizeCommands(parsed.commands)

    return json({ reply, commands })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return json({ reply: `AI 프록시 오류: ${detail.slice(0, 160)}`, commands: [] }, 500)
  }
}
