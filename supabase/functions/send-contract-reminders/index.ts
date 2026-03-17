import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Use the existing reminders_due_today() DB function
  const { data: reminders, error } = await supabase.rpc("reminders_due_today");

  if (error) {
    console.error("Error fetching reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No reminders due today" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of reminders) {
    const sendTo = r.send_to;
    if (!sendTo) {
      skipped++;
      continue;
    }

    const subject = r.subject || `Contract Reminder: ${r.title}`;
    const body = [
      `<h2>Contract Reminder</h2>`,
      `<p><strong>Contract:</strong> ${r.title}</p>`,
      `<p><strong>Deadline type:</strong> ${r.date_type}</p>`,
      `<p><strong>Due date:</strong> ${r.due_date}</p>`,
      `<p><strong>Reminder:</strong> ${r.offset_value} ${r.offset_unit}(s) before deadline</p>`,
    ].join("\n");

    try {
      // Send via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Reminders <onboarding@resend.dev>",
          to: [sendTo],
          subject,
          html: body,
        }),
      });

      const emailResult = await emailRes.json();

      if (!emailRes.ok) {
        const errMsg = `Failed to send to ${sendTo}: ${JSON.stringify(emailResult)}`;
        console.error(errMsg);
        errors.push(errMsg);

        // Log failure
        await supabase.rpc("log_notification", {
          p_user_id: r.user_id,
          p_contract_id: r.contract_id,
          p_contract_date_id: r.contract_date_id,
          p_channel: r.channel || "email",
          p_fire_on_date: r.fire_on_date,
          p_sent_to: sendTo,
          p_subject: subject,
          p_dedupe_key: r.dedupe_key,
          p_status: "failed",
          p_error: JSON.stringify(emailResult),
        });
        continue;
      }

      // Log success
      await supabase.rpc("log_notification", {
        p_user_id: r.user_id,
        p_contract_id: r.contract_id,
        p_contract_date_id: r.contract_date_id,
        p_channel: r.channel || "email",
        p_fire_on_date: r.fire_on_date,
        p_sent_to: sendTo,
        p_subject: subject,
        p_dedupe_key: r.dedupe_key,
        p_status: "sent",
      });

      sent++;
    } catch (e: unknown) {
      const errMsg = `Exception sending to ${sendTo}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }
  }

  return new Response(
    JSON.stringify({ sent, skipped, errors: errors.length, total: reminders.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
