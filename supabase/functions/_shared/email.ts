// Centralized Resend email service for ContractGuard
// All edge functions should use this module for sending emails.

// ── Sender Identities ──────────────────────────────────────────────
export const SENDERS = {
  default: "ContractGuard <noreply@mail.contractguard.cloud>",
  notifications: "ContractGuard Notifications <notifications@mail.contractguard.cloud>",
  support: "ContractGuard Support <support@mail.contractguard.cloud>",
} as const;

export type SenderKey = keyof typeof SENDERS;

// ── Types ───────────────────────────────────────────────────────────
export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

// ── Core sender (internal) ──────────────────────────────────────────
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const from = params.from ?? SENDERS.default;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      const errMsg = JSON.stringify(body);
      console.error(`[email] Resend error (${res.status}): ${errMsg}`);
      return { success: false, error: errMsg };
    }

    return { success: true, id: body.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] Exception: ${msg}`);
    return { success: false, error: msg };
  }
}

// ── HTML escaping ───────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Shared HTML helpers ─────────────────────────────────────────────
function layout(content: string, footer?: string): string {
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
        <tr><td style="padding:28px 32px">${content}</td></tr>
        <!-- Footer -->
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

// ── Template Functions ──────────────────────────────────────────────

export async function sendInviteEmail(params: {
  to: string;
  inviteLink: string;
  workspaceName?: string;
  inviterName?: string;
}): Promise<EmailResult> {
  const ws = escapeHtml(params.workspaceName || "a workspace");
  const inviter = escapeHtml(params.inviterName || "A teammate");

  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">You've been invited</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">
      <strong>${inviter}</strong> has invited you to join <strong>${ws}</strong> on ContractGuard.
    </p>
    <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
      Click the button below to create your account and get started.
    </p>
    ${ctaButton(params.inviteLink, "Accept Invitation")}
  `);

  return sendEmail({
    to: params.to,
    subject: `${inviter} invited you to ${ws}`,
    html,
    from: SENDERS.default,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
  userName?: string;
}): Promise<EmailResult> {
  const greeting = params.userName ? `Hi ${params.userName},` : "Hi,";

  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Reset your password</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6">${greeting}</p>
    <p style="margin:0 0 4px;font-size:15px;color:#3f3f46;line-height:1.6">
      We received a request to reset your ContractGuard password. Click the button below to set a new one.
    </p>
    ${ctaButton(params.resetLink, "Reset Password")}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you didn't request this, you can safely ignore this email.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: "Reset your ContractGuard password",
    html,
    from: SENDERS.default,
  });
}

export async function sendContractReminderEmail(params: {
  to: string;
  contractName: string;
  expiryDate: string;
  contractLink?: string;
  workspaceName?: string;
  dateType?: string;
  offsetValue?: number;
  offsetUnit?: string;
}): Promise<EmailResult> {
  const deadlineLabel = params.dateType || "deadline";
  const offsetText = params.offsetValue && params.offsetUnit
    ? `${params.offsetValue} ${params.offsetUnit}(s) before`
    : "";

  let ctaHtml = "";
  if (params.contractLink) {
    ctaHtml = ctaButton(params.contractLink, "View Contract");
  }

  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">Contract Reminder</h2>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%">
      <tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:120px">Contract</td>
          <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:600">${params.contractName}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#71717a">Deadline type</td>
          <td style="padding:8px 0;font-size:14px;color:#18181b">${deadlineLabel}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#71717a">Due date</td>
          <td style="padding:8px 0;font-size:14px;color:#18181b">${params.expiryDate}</td></tr>
      ${offsetText ? `<tr><td style="padding:8px 0;font-size:14px;color:#71717a">Reminder</td>
          <td style="padding:8px 0;font-size:14px;color:#18181b">${offsetText}</td></tr>` : ""}
    </table>
    ${ctaHtml}
  `, params.workspaceName
    ? `This reminder was sent by ContractGuard for workspace "${params.workspaceName}".`
    : undefined);

  return sendEmail({
    to: params.to,
    subject: `Reminder: ${params.contractName} — ${deadlineLabel} due ${params.expiryDate}`,
    html,
    from: SENDERS.notifications,
  });
}

export async function sendGeneralNotificationEmail(params: {
  to: string;
  subject: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}): Promise<EmailResult> {
  let ctaHtml = "";
  if (params.actionLink) {
    ctaHtml = ctaButton(params.actionLink, params.actionText || "View Details");
  }

  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">${params.subject}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6">${params.message}</p>
    ${ctaHtml}
  `);

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html,
    from: SENDERS.notifications,
  });
}

export async function sendSupportAcknowledgementEmail(params: {
  to: string;
  subject?: string;
  message?: string;
  ticketId?: string;
}): Promise<EmailResult> {
  const subj = params.subject || "We received your request";
  const ticketLine = params.ticketId
    ? `<p style="margin:0 0 8px;font-size:13px;color:#71717a">Reference: <strong>${params.ticketId}</strong></p>`
    : "";

  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b">${subj}</h2>
    ${ticketLine}
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6">
      ${params.message || "Thank you for reaching out. Our team has received your request and will get back to you shortly."}
    </p>
  `, "This email was sent by ContractGuard Support. If you need further help, reply to this email.");

  return sendEmail({
    to: params.to,
    subject: subj,
    html,
    from: SENDERS.support,
    replyTo: "support@mail.contractguard.cloud",
  });
}
