CREATE OR REPLACE FUNCTION public.reminders_due_today()
 RETURNS TABLE(user_id uuid, contract_id uuid, contract_date_id uuid, title text, date_type text, due_date date, channel text, send_to text, fire_on_date date, offset_value integer, offset_unit text, dedupe_key text, subject text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    c.user_id,
    c.id as contract_id,
    cd.id as contract_date_id,
    c.title,
    cd.type as date_type,
    cd.due_date,
    rr.channel,
    coalesce(p.notification_email, '') as send_to,
    (
      cd.due_date
      - (rr.offset_value * case rr.offset_unit
          when 'day' then interval '1 day'
          when 'week' then interval '1 week'
          when 'month' then interval '1 month'
        end)
    )::date as fire_on_date,
    rr.offset_value,
    rr.offset_unit,
    (
      c.user_id::text || ':' ||
      cd.id::text || ':' ||
      rr.channel || ':' ||
      (
        cd.due_date
        - (rr.offset_value * case rr.offset_unit
            when 'day' then interval '1 day'
            when 'week' then interval '1 week'
            when 'month' then interval '1 month'
          end)
      )::date::text || ':' ||
      rr.offset_value::text || ':' ||
      rr.offset_unit
    ) as dedupe_key,
    (
      'Reminder: ' || c.title || ' - ' || cd.type ||
      ' (' || rr.offset_value || ' ' || rr.offset_unit || ' before)'
    ) as subject
  from public.contract_dates cd
  join public.contracts c
    on c.id = cd.contract_id
  join public.reminder_rules rr
    on rr.user_id = c.user_id
   and (rr.date_type = cd.type OR rr.date_type = 'all')
   and rr.enabled = true
  left join public.profiles p
    on p.user_id = c.user_id
  where
    (
      cd.due_date
      - (rr.offset_value * case rr.offset_unit
          when 'day' then interval '1 day'
          when 'week' then interval '1 week'
          when 'month' then interval '1 month'
        end)
    )::date = current_date
    and not exists (
      select 1
      from public.notification_log nl
      where nl.dedupe_key =
        (
          c.user_id::text || ':' ||
          cd.id::text || ':' ||
          rr.channel || ':' ||
          (
            cd.due_date
            - (rr.offset_value * case rr.offset_unit
                when 'day' then interval '1 day'
                when 'week' then interval '1 week'
                when 'month' then interval '1 month'
              end)
          )::date::text || ':' ||
          rr.offset_value::text || ':' ||
          rr.offset_unit
        )
    )
  order by fire_on_date asc, cd.due_date asc;
$function$;