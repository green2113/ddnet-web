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
  'access-control-allow-methods': 'POST, OPTIONS',
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

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'access-control-max-age': '86400' },
  })

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
  const catalogJson = JSON.stringify(body.catalog ?? {})

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

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const apiKey = (env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    // Non-200 so the client falls back to its local rule-based handler.
    return json({ reply: 'AI 서버가 아직 설정되지 않았습니다.', commands: [] }, 500)
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
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 600,
      }),
    })
  } catch {
    return json({ reply: 'AI 서버에 연결하지 못했습니다.', commands: [] }, 502)
  }

  if (!upstream.ok) {
    return json({ reply: `AI 서버 오류 (HTTP ${upstream.status})`, commands: [] }, 502)
  }

  let completion: {
    choices?: Array<{ message?: { content?: string } }>
  }
  try {
    completion = await upstream.json()
  } catch {
    return json({ reply: 'AI 응답을 해석하지 못했습니다.', commands: [] }, 502)
  }

  const content = completion?.choices?.[0]?.message?.content
  if (!content) {
    return json({ reply: 'AI 응답이 비어 있습니다.', commands: [] }, 502)
  }

  let parsed: { reply?: unknown; commands?: unknown }
  try {
    parsed = JSON.parse(content)
  } catch {
    // The model occasionally wraps JSON in prose; try to salvage the object.
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(content.slice(start, end + 1))
      } catch {
        return json({ reply: 'AI 응답 형식이 올바르지 않습니다.', commands: [] }, 502)
      }
    } else {
      return json({ reply: 'AI 응답 형식이 올바르지 않습니다.', commands: [] }, 502)
    }
  }

  const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim().slice(0, 480) : '요청을 처리했습니다.'
  const commands = sanitizeCommands(parsed.commands)

  return json({ reply, commands })
}
