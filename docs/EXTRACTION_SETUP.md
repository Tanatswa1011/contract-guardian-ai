# AI Contract Extraction (MVP)

## Overview

After a PDF is uploaded, the system automatically:
1. Extracts text from the PDF
2. Sends it to OpenAI for structured extraction
3. Saves the result in `extraction_runs`
4. Surfaces extracted values on the contract detail page for user review

**Extraction happens immediately after upload** (fire-and-forget). The user reviews and confirms on the contract detail page.

## Environment Variables

### Supabase Edge Function: `extract-contract`

Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets, or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini |

The following are provided automatically by Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Extraction Flow

1. **Upload** (`UploadPage`): User uploads PDF → contract + `contract_files` row created → `extract-contract` Edge Function invoked (async)
2. **Extract** (Edge Function): Download PDF from storage → extract text (unpdf) → call OpenAI → save to `extraction_runs`
3. **Review** (`ContractDetailPage`): User sees extracted values pre-filled in form (when contract fields empty), suggested deadlines, and missing-fields banner

## OpenAI Prompt

The prompt instructs the model to:
- Extract only: `contract_title`, `counterparty`, `start_date`, `end_date`, `renewal_date`, `notice_date`, `payment_date`
- Return dates in ISO format (YYYY-MM-DD) or `null` if uncertain
- Prefer under-extraction over hallucination
- Return strict JSON only

## Schema

- **extraction_runs**: Stores raw OpenAI response, `missing_fields`, `needs_review`, `status`, `error`
- **contracts**: User confirms and saves title, counterparty, start_date, end_date
- **contract_dates**: User adds renewal/notice/payment dates from suggestions or manually

## Retry

- If extraction fails: "Retry" button in the error banner
- If no extraction exists: "Run AI extraction" button in the Files section
