# ContractGuard AI

**Never miss a contract deadline again.**

Small teams sign SaaS subscriptions, agency retainers and supplier agreements, then lose track of them. A contract renews automatically because nobody noticed the notice window closed 30 days before the renewal date. ContractGuard is a B2B SaaS MVP that reads the contract, works out the deadlines that matter, and reminds the right people in time.

> **Status:** MVP, not publicly launched. No paying customers. The hosted backend is currently paused, so run it locally against your own Supabase project.

## How it works

1. **Upload** a contract PDF.
2. **AI extraction.** A Supabase Edge Function pulls the text out of the PDF and asks an OpenAI model (default `gpt-4.1-mini`) for exactly six fields: counterparty, start date, end date, renewal date, notice date and notice period in days.
3. **No guessing.** The model must return `null` for anything that isn't explicitly in the contract. Any missing or uncertain field sets `needs_review`, and the contract is flagged for a person to check.
4. **Deadlines.** If the contract states a renewal date and a notice period but no notice date, ContractGuard computes it. Each date is labelled `extracted` or `computed`, so you can always tell what came from the document.
5. **Reminders.** A scheduled function sends reminder emails before each deadline, and Slack messages for workspaces that connect a webhook. Every send is logged.

## Features

- **Team workspaces:** create a workspace, invite colleagues by email, switch between workspaces. Data is scoped per workspace with Postgres row-level security.
- **Dashboard:** every contract with a status and health badge. On mobile, cards are swipeable.
- **Contract detail:** extracted fields, suggested deadlines, extraction history (every run is stored with its model and raw output) and the original file.
- **Notification settings:** reminder recipients and Slack webhook, with a test message.
- **Plans:** Starter (free, 5 contracts), Professional (€15/month, early-access waitlist) and Enterprise (contact form). Plan limits are enforced in the app.
- **Interactive demo** at `/demo`, with a sample dashboard, contract and reminder email preview. No sign-up needed.
- **Account deletion** removes the user and their data.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | Supabase: Postgres with row-level security, Auth, Storage, Edge Functions (Deno) |
| AI | OpenAI API (model configurable via `OPENAI_MODEL`) |
| Notifications | Email via Resend, Slack incoming webhooks |
| Tests | Vitest (extraction and deadline logic) |
| Hosting | Vercel |

## Run it locally

```bash
npm install
npm run dev     # http://localhost:8080
npm test
```

The committed `.env` points at the original Supabase project, which is paused. To use your own:

1. Create a Supabase project and apply `supabase/migrations/`.
2. Put your project URL and publishable (anon) key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
3. Deploy the functions in `supabase/functions/` and set their secrets (`OPENAI_API_KEY`, `RESEND_API_KEY`, `APP_URL`) in the Supabase dashboard. Never commit them.

`/demo` works without any backend.

## Repo layout

```
src/
  pages/            landing, pricing, auth, dashboard, upload, contract detail, settings, billing, demo
  components/       app layout, workspace switcher, pricing cards, settings panels, demo views
  lib/              extraction helpers, deadline suggestions, password rules
  config/plans.ts   plan definitions and limits
supabase/
  functions/        extract-contract-fields, send-contract-reminders, send-workspace-invite,
                    send-notification-email, send-slack-test, join-pro-waitlist, delete-user-account
  migrations/       workspaces, members, invites, waitlist, RLS policies
```

## How it was built

I defined the product: the problem, who it's for, the extraction rules ("return null, never guess"), the deadline logic, the reminder flow and the pricing. I built it with AI coding tools: Lovable for the first versions, then Cursor. That's why most commits are by `gpt-engineer-app[bot]` and `cursoragent`. I reviewed and tested what they produced and steered each iteration.

Built by [Tanatswa Phil Muganga](https://www.linkedin.com/in/tanatswaphilmuganga16) · [tanaphil.com](https://tanaphil.com)
