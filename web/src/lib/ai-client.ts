// web/src/lib/ai-client.ts
import { supabase } from '@/lib/supabase'

const AI_BASE = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:8000'

async function getAuthHeader(): Promise<Record<string, string>> {
  // getSession() is intentional here — we just need the access token to send to our backend.
  // The Python service validates the JWT independently (expiry, signature). getUser() would add
  // an unnecessary round-trip to Supabase auth for every AI request.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) console.warn('[ai-client] No session token — request sent without auth')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function checkAIHealth(timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${AI_BASE}/health`, { signal: controller.signal })
    clearTimeout(id)
    return res.ok
  } catch {
    return false
  }
}

export interface ParsedRow {
  row_id: number
  date: string
  amount: number
  description: string
  type: string
}

export interface CategoryResult {
  row_id: number
  suggested_category: string
  confidence: number
}

export async function categorizeTransactions(rows: ParsedRow[]): Promise<CategoryResult[]> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${AI_BASE}/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ transactions: rows }),
  })
  if (!res.ok) throw new Error(`Categorize failed: ${res.statusText}`)
  const data = await res.json()
  return data.results
}

export async function* streamChat(
  message: string,
  conversationId: string | null,
  onConversationId?: (id: string) => void,
): AsyncGenerator<string> {
  const authHeader = await getAuthHeader()
  const controller = new AbortController()
  // 2-minute timeout for multi-agent chains
  const timeoutId = setTimeout(() => controller.abort(), 120_000)

  let res: Response
  try {
    res = await fetch(`${AI_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ message, conversation_id: conversationId }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The AI is taking too long — please try again.')
    }
    throw err
  }

  if (!res.ok || !res.body) {
    clearTimeout(timeoutId)
    throw new Error('Chat request failed')
  }

  const serverConvId = res.headers.get('x-conversation-id')
  if (serverConvId && !conversationId) {
    onConversationId?.(serverConvId)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>
      try {
        result = await reader.read()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('Request timed out. The AI is taking too long — please try again.')
        }
        throw err
      }
      if (result.done) break
      const text = decoder.decode(result.value)
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6)
          if (payload === '[DONE]') return
          try {
            yield JSON.parse(payload)
          } catch {
            yield payload
          }
        }
      }
    }
  } finally {
    clearTimeout(timeoutId)
    reader.releaseLock()
  }
}
