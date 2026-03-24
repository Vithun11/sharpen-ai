# Examind — Exam Intelligence Platform

AI-powered exam analysis platform for teachers. Upload student answer sheets, get instant cognitive profiles and teaching guidance.

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://anthropic.com) API key (for production AI analysis)

### Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Configure environment variables** — create `.env.local` in the project root:

   ```env
   # ── Supabase ──────────────────────────────────────────────
   # Your project URL (found in Project Settings → API)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

   # Public anon key (safe to expose in browser)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

   # Service role key — NEVER expose publicly, server-side only
   SUPABASE_SERVICE_ROLE_KEY=eyJ...

   # ── AI Provider ──────────────────────────────────────────
   # Anthropic Claude API key for answer sheet analysis
   ANTHROPIC_API_KEY=sk-ant-...

   # Optional: switch AI provider (default: anthropic)
   # AI_PROVIDER=anthropic         # or: openai, openai-compatible
   # AI_BASE_URL=https://...       # only for openai-compatible providers
   # AI_MODEL=claude-sonnet-4-...  # override model name

   # ── Development mode ─────────────────────────────────────
   # Set to true to test without AI API — returns realistic mock data
   # Set to false (or remove) in production
   MOCK_AI=true
   ```

3. **Set up Supabase**
   - Run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor
   - Create a private Storage bucket named `answer-sheets`

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `ANTHROPIC_API_KEY` | ✅ Production | Claude API key for AI analysis |
| `AI_PROVIDER` | ⬜ Optional | `anthropic` (default) \| `openai` \| `openai-compatible` |
| `AI_BASE_URL` | ⬜ Optional | Base URL for OpenAI-compatible APIs |
| `AI_MODEL` | ⬜ Optional | Override the AI model name |
| `MOCK_AI` | ⬜ Dev only | `true` = skip AI, return mock data |

## Full User Flow

1. **Sign up** → Confirm email → **Login**
2. **Create a class** (name, subject, school)
3. **Add students** to the class
4. **Create an exam** → Upload question paper image → AI extracts questions
5. **Upload answer sheets** per student → Claude analyzes handwriting
6. **View individual reports** — score, cognitive profile, topic mastery, teacher guidance
7. **View class analytics** — rankings, hardest topic, topic mastery heatmap

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (server-side)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Storage**: Supabase Storage (answer sheet images)
- **AI**: Claude (Anthropic) via vision API
- **Fonts**: DM Sans + DM Mono (Google Fonts)

## Security

- All database operations use Row Level Security (RLS)
- Supabase service role key is only used server-side (API routes)
- Authentication via Supabase Auth (email + password)
- Answer sheets are stored in a **private** bucket

## Development vs Production

| Feature | `MOCK_AI=true` | Production |
|---|---|---|
| Question extraction | Returns 5 sample questions | Claude reads the image |
| Answer sheet analysis | Returns mock report | Claude analyzes handwriting |
| Storage upload | Skipped | Saved to Supabase Storage |
| Analysis time | ~2 seconds | 10–20 seconds |
