const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

/**
 * Generate a creative playlist name using Claude.
 * Requires the user's Anthropic API key (stored in Settings).
 * NOTE: Anthropic's API supports CORS for browser requests with a valid key.
 */
export async function generatePlaylistName(songs, apiKey) {
  if (!apiKey) {
    const err = new Error('No Anthropic API key — open ⚙ Settings to add one.')
    err.code = 'NO_AI_KEY'
    throw err
  }

  const titles = songs
    .slice(0, 8)
    .map((s) => s.title)
    .join(', ')

  const prompt = titles.length
    ? `Based on these songs: ${titles}\n\nGenerate ONE short, creative playlist name (3-5 words max). Only the name, no explanation.`
    : 'Generate ONE short, creative music playlist name (3-5 words max). Only the name, no explanation.'

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    const msg = data?.error?.message ?? 'AI request failed.'
    const err = new Error(msg)
    if (response.status === 401) err.code = 'INVALID_AI_KEY'
    throw err
  }

  return data.content?.[0]?.text?.trim() ?? 'My Playlist'
}

/**
 * Get a mood description for the current song using Claude.
 */
export async function getSongMood(song, apiKey) {
  if (!apiKey) return null

  const prompt = `Song: "${song.title}" by ${song.artist}\n\nDescribe the mood of this song in 5-7 words. Only the mood description, no other text.`

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 25,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  if (!response.ok) return null
  return data.content?.[0]?.text?.trim() ?? null
}
