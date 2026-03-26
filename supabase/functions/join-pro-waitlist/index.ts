import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, SENDERS, waitlistEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, workspace_name, source } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ error: "A valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If authenticated, verify email matches the user (prevent relay abuse)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabaseUser.auth.getClaims(token);

      // If we got valid user claims, enforce email match
      if (claimsData?.claims?.sub) {
        const userEmail = (claimsData.claims.email as string)?.toLowerCase();
        if (userEmail && normalizedEmail !== userEmail) {
          return new Response(
            JSON.stringify({ error: "Email must match your account" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      // If claims fail (anon key), allow through — user is unauthenticated
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabaseAdmin
      .from("pro_waitlist")
      .insert({
        email: normalizedEmail,
        workspace_name: workspace_name?.trim() || null,
        source: source || "billing_page",
      });

    if (insertError) {
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

    // Send confirmation email (fire-and-forget)
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "ContractGuardAI Pro waitlist confirmed",
        html: waitlistEmailHtml(),
        from: SENDERS.default,
      });
    } catch (emailErr) {
      console.error("[waitlist] Email send failed:", emailErr);
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
