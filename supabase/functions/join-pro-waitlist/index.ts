import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, SENDERS } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function waitlistEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #e4e4e7">
          <span style="font-size:18px;font-weight:700;color:#18181b">🛡️ ContractGuard</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px">
          <h2 style="margin:0 0 16px;font-size:22px;color:#18181b">You're on the Pro waitlist 🎉</h2>

          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">
            Thanks for joining the ContractGuardAI Pro waitlist.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6">You'll get:</p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;color:#3f3f46;line-height:1.8">
            <li>Early access to Pro</li>
            <li><strong>50% off</strong> your first month</li>
            <li>A notification as soon as Pro launches</li>
          </ul>

          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>

          <h3 style="margin:0 0 8px;font-size:16px;color:#18181b">Why this exists</h3>
          <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6">
            Managing contracts manually is risky. Deadlines get missed. Renewals happen automatically. Important dates slip through the cracks. That's exactly what ContractGuardAI is built to solve.
          </p>

          <h3 style="margin:0 0 8px;font-size:16px;color:#18181b">What you'll get with Pro</h3>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#52525b;line-height:1.8">
            <li>Track unlimited contracts in one place</li>
            <li>Get reminders before deadlines — not after</li>
            <li>Send alerts directly to Slack</li>
            <li>Collaborate with your team</li>
            <li>Stay in control of every contract lifecycle</li>
          </ul>

          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>

          <p style="margin:0 0 4px;font-size:15px;color:#18181b;font-weight:600">No more missed deadlines.</p>
          <p style="margin:0 0 4px;font-size:15px;color:#18181b;font-weight:600">No more surprise renewals.</p>
          <p style="margin:0 0 16px;font-size:15px;color:#18181b;font-weight:600">No more scrambling to find contract details.</p>
          <p style="margin:0 0 0;font-size:15px;color:#3f3f46;line-height:1.6">Just clarity, control, and peace of mind.</p>

          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>

          <p style="margin:0;font-size:15px;color:#3f3f46;line-height:1.6">
            We'll notify you as soon as Pro is ready.
          </p>
          <p style="margin:12px 0 0;font-size:15px;color:#3f3f46">— ContractGuardAI</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6">
            This is an automated message from ContractGuard. Please do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent email relay abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, workspace_name, source } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure submitted email matches authenticated user to prevent relay
    if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email must match your account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try insert — unique constraint will reject duplicates
    const { error: insertError } = await supabaseAdmin
      .from("pro_waitlist")
      .insert({
        email: normalizedEmail,
        workspace_name: workspace_name?.trim() || null,
        source: source || "billing_page",
      });

    if (insertError) {
      // Duplicate email (unique violation)
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ success: true, already_exists: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("[waitlist] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Something went wrong" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New signup — send confirmation email (fire-and-forget, don't block success)
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "ContractGuardAI Pro waitlist confirmed 🎉",
        html: waitlistEmailHtml(),
        from: SENDERS.default,
      });
    } catch (emailErr) {
      console.error("[waitlist] Email send failed:", emailErr);
      // Don't fail the request — signup succeeded
    }

    return new Response(
      JSON.stringify({ success: true, already_exists: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[waitlist] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
