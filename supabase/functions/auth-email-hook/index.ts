import { sendEmail, SENDERS } from "../_shared/email.ts";
import { createHmac } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Email type → template mapping ───────────────────────────────────

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

interface HookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      display_name?: string;
      full_name?: string;
    };
  };
  email_data: EmailData;
}

function buildConfirmUrl(supabaseUrl: string, data: EmailData): string {
  const type = data.email_action_type === "recovery" ? "recovery" : data.email_action_type;
  const params = new URLSearchParams({
    token_hash: data.token_hash,
    type,
    redirect_to: data.redirect_to || data.site_url,
  });
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
}

function layout(content: string, footer?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #e4e4e7">
          <span style="font-size:18px;font-weight:700;color:#18181b">🛡️ ContractGuard</span>
        </td></tr>
        <tr><td style="padding:28px 32px">${content}</td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6">
            ${footer || "This is an automated message from ContractGuard. Please do not reply to this email."}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td>
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">${label}</a>
  </td></tr></table>
  <p style="margin:0;font-size:12px;color:#a1a1aa">Or copy this link: <a href="${url}" style="color:#2563eb;word-break:break-all">${url}</a></p>`;
}

function buildEmailContent(type: string, confirmUrl: string, userName?: string): { subject: string; html: string } {
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  switch (type) {
    case "signup":
      return {
        subject: "Confirm your ContractGuard account",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Verify your email</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            Thanks for signing up for ContractGuard. Click the button below to verify your email address and get started.
          </p>
          ${ctaButton(confirmUrl, "Verify Email")}
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you didn't create this account, you can safely ignore this email.</p>
        `),
      };

    case "recovery":
      return {
        subject: "Reset your ContractGuard password",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Reset your password</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            We received a request to reset your ContractGuard password. Click the button below to set a new one.
          </p>
          ${ctaButton(confirmUrl, "Reset Password")}
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
        `),
      };

    case "magic_link":
      return {
        subject: "Your ContractGuard login link",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Sign in to ContractGuard</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            Click the button below to sign in to your ContractGuard account. This link expires in 10 minutes.
          </p>
          ${ctaButton(confirmUrl, "Sign In")}
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you didn't request this link, you can safely ignore this email.</p>
        `),
      };

    case "email_change":
      return {
        subject: "Confirm your new email address",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Confirm email change</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            Click the button below to confirm your new email address for ContractGuard.
          </p>
          ${ctaButton(confirmUrl, "Confirm Email Change")}
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you didn't request this change, please secure your account immediately.</p>
        `),
      };

    case "reauthentication":
      return {
        subject: "ContractGuard verification code",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Verification code</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            Your ContractGuard verification code is below. Enter it in the app to continue.
          </p>
          <p style="margin:16px 0;font-size:32px;font-weight:700;color:#18181b;letter-spacing:4px;text-align:center">${confirmUrl}</p>
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">This code expires in 10 minutes. If you didn't request this, please secure your account.</p>
        `),
      };

    default:
      return {
        subject: "ContractGuard notification",
        html: layout(`
          <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Action required</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
            Click the button below to complete your action.
          </p>
          ${ctaButton(confirmUrl, "Continue")}
        `),
      };
  }
}

// ── Webhook signature verification ──────────────────────────────────

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expected = signature.replace(/^sha256=/, "");
    return computed === expected;
  } catch {
    return false;
  }
}

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    if (hookSecret) {
      const signature = req.headers.get("x-supabase-webhook-signature") || "";
      const valid = await verifySignature(rawBody, signature, hookSecret);
      if (!valid) {
        console.error("[auth-email-hook] Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload: HookPayload = JSON.parse(rawBody);
    const { user, email_data } = payload;

    if (!user?.email || !email_data?.email_action_type) {
      console.error("[auth-email-hook] Missing required fields in payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      undefined;

    // For reauthentication, use the raw token (OTP code) instead of a URL
    let confirmUrl: string;
    if (email_data.email_action_type === "reauthentication") {
      confirmUrl = email_data.token; // Pass OTP code directly
    } else {
      confirmUrl = buildConfirmUrl(supabaseUrl, email_data);
    }

    const { subject, html } = buildEmailContent(
      email_data.email_action_type,
      confirmUrl,
      userName
    );

    console.log(
      `[auth-email-hook] Sending ${email_data.email_action_type} email to ${user.email}`
    );

    const result = await sendEmail({
      to: user.email,
      subject,
      html,
      from: SENDERS.default,
    });

    if (!result.success) {
      console.error(`[auth-email-hook] Failed: ${result.error}`);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[auth-email-hook] Sent ${email_data.email_action_type} email (id: ${result.id})`
    );

    // Return success — Supabase Auth expects a 200 with no error
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[auth-email-hook] Exception: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
