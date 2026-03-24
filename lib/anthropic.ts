import Anthropic from '@anthropic-ai/sdk'

// Configured Anthropic client — server-side only
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model to use for all analysis
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

// Timeout in milliseconds for AI analysis requests
export const ANALYSIS_TIMEOUT_MS = 30_000
