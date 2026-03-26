import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, SENDERS, waitlistEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
