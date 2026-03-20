
-- Recreate contracts_dashboard view with security_invoker = true
-- This ensures the view respects the calling user's RLS policies on underlying tables
DROP VIEW IF EXISTS public.contracts_dashboard;

CREATE VIEW public.contracts_dashboard
WITH (security_invoker = true)
AS
WITH upcoming_dates AS (
    SELECT c.id AS contract_id,
        d.due_date AS event_date,
        d.type AS event_type,
        'contract_date'::text AS source
    FROM contracts c
    JOIN contract_dates d ON d.contract_id = c.id
    WHERE d.due_date IS NOT NULL AND d.due_date >= CURRENT_DATE
    UNION ALL
    SELECT c.id AS contract_id,
        c.end_date AS event_date,
        'end'::text AS event_type,
        'end_date'::text AS source
    FROM contracts c
    WHERE c.end_date IS NOT NULL AND c.end_date >= CURRENT_DATE
), next_event AS (
    SELECT DISTINCT ON (contract_id) contract_id, event_date, event_type, source
    FROM upcoming_dates
    ORDER BY contract_id, event_date
), overdue AS (
    SELECT c.id AS contract_id,
        EXISTS (
            SELECT 1 FROM contract_dates d
            WHERE d.contract_id = c.id AND d.due_date IS NOT NULL AND d.due_date < CURRENT_DATE
        ) AS has_overdue_dates
    FROM contracts c
), latest_extraction AS (
    SELECT DISTINCT ON (contract_id) contract_id,
        status AS extraction_status, model AS extraction_model,
        needs_review, missing_fields, created_at AS extracted_at
    FROM extraction_runs
    ORDER BY contract_id, created_at DESC
)
SELECT c.id, c.user_id, c.title, c.counterparty, c.status, c.start_date, c.end_date,
    ne.event_date AS next_deadline_date, ne.event_type AS next_deadline_type,
    ne.source AS next_deadline_source,
    CASE WHEN ne.event_date IS NULL THEN NULL::integer ELSE (ne.event_date - CURRENT_DATE) END AS days_until_next_deadline,
    o.has_overdue_dates,
    CASE WHEN ne.event_date IS NOT NULL AND ne.event_date <= (CURRENT_DATE + 30) THEN true ELSE false END AS expiring_within_30_days,
    CASE WHEN o.has_overdue_dates = true THEN true ELSE false END AS risk_alert,
    le.extraction_status, le.extraction_model, le.needs_review, le.missing_fields, le.extracted_at,
    CASE
        WHEN o.has_overdue_dates THEN 'overdue'::text
        WHEN ne.event_date IS NOT NULL AND ne.event_date <= (CURRENT_DATE + 30) THEN 'expiring_soon'::text
        WHEN le.needs_review THEN 'needs_review'::text
        WHEN ne.event_date IS NULL AND c.end_date IS NULL THEN 'missing_dates'::text
        ELSE 'ok'::text
    END AS health_status,
    c.created_at, c.updated_at
FROM contracts c
LEFT JOIN next_event ne ON ne.contract_id = c.id
LEFT JOIN overdue o ON o.contract_id = c.id
LEFT JOIN latest_extraction le ON le.contract_id = c.id;
