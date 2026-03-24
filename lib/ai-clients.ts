import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const SONNET = "claude-sonnet-4-20250514"
export const HAIKU = "claude-haiku-4-5-20251001"
export const GROQ_MODEL = "llama-3.3-70b-versatile"
