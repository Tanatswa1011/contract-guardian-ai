import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  sendGeneralNotificationEmail,
  sendSupportAcknowledgementEmail,
} from "../_shared/email.ts";

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
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, to, subject, message, actionLink, actionText, ticketId } = body;

    if (!to || !type) {
      return new Response(JSON.stringify({ error: "Missing 'to' and 'type'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Prevent email relay abuse — only allow sending to the authenticated user's own email
    // or their configured notification email
    const userEmail = user.email?.toLowerCase();
    const recipientEmail = to.trim().toLowerCase();

    // Fetch user's notification email from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_email")
      .eq("user_id", user.id)
      .single();

    const notificationEmail = profile?.notification_email?.toLowerCase();
    const allowedEmails = new Set(
      [userEmail, notificationEmail].filter(Boolean) as string[]
    );

    if (!allowedEmails.has(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: "You can only send notifications to your own email address." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    if (typeof to !== "string" || to.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subject && (typeof subject !== "string" || subject.length > 500)) {
      return new Response(JSON.stringify({ error: "Subject too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message && (typeof message !== "string" || message.length > 5000)) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    if (type === "support") {
      result = await sendSupportAcknowledgementEmail({
        to: recipientEmail,
        subject,
        message,
        ticketId,
      });
    } else {
      result = await sendGeneralNotificationEmail({
        to: recipientEmail,
        subject: subject || "Notification from ContractGuard",
        message: message || "",
        actionLink,
        actionText,
      });
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Failed to send notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("send-notification-email failed:", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
