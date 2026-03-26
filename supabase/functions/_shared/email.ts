// ContractGuard AI — Premium transactional email system
// Dark theme, enterprise-grade, Stripe/Linear inspired

// ── Brand Constants ─────────────────────────────────────────────────
const BRAND = {
  bg: "#0B0B0C",
  card: "#111111",
  surface: "#161616",
  border: "#1A1A1A",
  text: "#FFFFFF",
  muted: "#A1A1AA",
  dim: "#6B7280",
  ctaBg: "#FFFFFF",
  ctaText: "#000000",
  radius: "12px",
  maxWidth: "540px",
  fontStack:
    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

// ── Sender Identities ───────────────────────────────────────────────
export const SENDERS = {
  default:
    "ContractGuard <noreply@mail.contractguard.cloud>",
  notifications:
    "ContractGuard <notifications@mail.contractguard.cloud>",
  support:
    "ContractGuard Support <support@mail.contractguard.cloud>",
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

// ── Core sender ─────────────────────────────────────────────────────
export async function sendEmail(
  params: SendEmailParams
): Promise<EmailResult> {
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
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Shield logo SVG (inline, white) ─────────────────────────────────
function logoSvg(): string {
  return `<svg viewBox="0 0 64 64" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 3L7 15.5v17.5c0 15.2 10.6 29.2 25 33 14.4-3.8 25-17.8 25-33V15.5L32 3Z" fill="#fff"/>
    <path d="M26 28v-4a6 6 0 0 1 12 0v4" stroke="#111" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="23" y="28" width="18" height="14" rx="2.5" fill="#111"/>
    <circle cx="32" cy="33.5" r="2.5" fill="#fff"/>
    <path d="M32 35.5v3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

// ── Layout ──────────────────────────────────────────────────────────
function layout(content: string, footer?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    body,table,td{font-family:${BRAND.fontStack}}
    @media(max-width:600px){
      .email-card{border-radius:0!important}
      .cta-btn{display:block!important;width:100%!important;text-align:center!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};-webkit-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:48px 16px">
    <tr><td align="center">
      <table class="email-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:${BRAND.maxWidth};background:${BRAND.card};border-radius:${BRAND.radius};border:1px solid ${BRAND.border};overflow:hidden">
        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid ${BRAND.border}">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px">${logoSvg()}</td>
            <td style="vertical-align:middle">
              <span style="font-size:14px;font-weight:700;letter-spacing:0.06em;color:${BRAND.text};text-transform:uppercase">ContractGuard</span>
              <span style="display:block;font-size:9px;font-weight:500;letter-spacing:0.2em;color:${BRAND.dim};text-transform:uppercase;margin-top:1px">AI</span>
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid ${BRAND.border}">
          <p style="margin:0;font-size:12px;color:${BRAND.dim};line-height:1.6">
            ${footer || "This is an automated message from ContractGuard. Please do not reply."}
          </p>
        </td></tr>
      </table>
      <!-- Sub-footer -->
      <p style="margin:24px 0 0;font-size:11px;color:${BRAND.dim};text-align:center">
        &copy; ${new Date().getFullYear()} ContractGuard AI. All rights reserved.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Heading ─────────────────────────────────────────────────────────
function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};line-height:1.3;letter-spacing:-0.01em">${text}</h1>`;
}

// ── Body text ───────────────────────────────────────────────────────
function bodyText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.65">${text}</p>`;
}

// ── CTA button ──────────────────────────────────────────────────────
function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 12px"><tr><td>
  <a class="cta-btn" href="${url}" style="display:inline-block;padding:13px 32px;background:${BRAND.ctaBg};color:${BRAND.ctaText};text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.01em">${label}</a>
</td></tr></table>
<p style="margin:0;font-size:12px;color:${BRAND.dim}">Or copy this link:<br><a href="${url}" style="color:${BRAND.muted};word-break:break-all;text-decoration:underline">${url}</a></p>`;
}

// ── Info box (highlighted detail card) ──────────────────────────────
function infoBox(rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:${BRAND.dim};white-space:nowrap;vertical-align:top">${r.label}</td>
          <td style="padding:8px 12px;font-size:14px;color:${BRAND.text};font-weight:500">${r.value}</td>
        </tr>`
    )
    .join("");

  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:8px;margin:20px 0">
    ${rowsHtml}
  </table>`;
}

// ── Divider ─────────────────────────────────────────────────────────
function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0"/>`;
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export async function sendInviteEmail(params: {
  to: string;
  inviteLink: string;
  workspaceName?: string;
  inviterName?: string;
}): Promise<EmailResult> {
  const ws = esc(params.workspaceName || "a workspace");
  const inviter = esc(params.inviterName || "A teammate");

  const html = layout(
    heading("You've been invited") +
    bodyText(`<strong style="color:${BRAND.text}">${inviter}</strong> has invited you to join <strong style="color:${BRAND.text}">${ws}</strong> on ContractGuard.`) +
    bodyText("Click below to create your account and get started.") +
    ctaButton(params.inviteLink, "Accept Invitation")
  );

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
  const greeting = params.userName
    ? `Hi ${esc(params.userName)},`
    : "Hi,";

  const html = layout(
    heading("Reset your password") +
    bodyText(greeting) +
    bodyText("We received a request to reset your ContractGuard password. Click below to set a new one.") +
    ctaButton(params.resetLink, "Reset Password") +
    `<p style="margin:20px 0 0;font-size:13px;color:${BRAND.dim}">If you didn't request this, you can safely ignore this email.</p>`
  );

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
  const contractName = esc(params.contractName);
  const expiryDate = esc(params.expiryDate);
  const deadlineLabel = esc(params.dateType || "deadline");
  const offsetText =
    params.offsetValue && params.offsetUnit
      ? `${params.offsetValue} ${esc(params.offsetUnit)}(s) before`
      : "";
  const workspaceName = params.workspaceName
    ? esc(params.workspaceName)
    : undefined;

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Contract", value: contractName },
    { label: "Deadline type", value: deadlineLabel },
    { label: "Due date", value: `<strong>${expiryDate}</strong>` },
  ];
  if (offsetText) {
    infoRows.push({ label: "Reminder", value: offsetText });
  }

  let ctaHtml = "";
  if (params.contractLink) {
    ctaHtml = ctaButton(params.contractLink, "View Contract");
  }

  const html = layout(
    heading("Contract Reminder") +
    bodyText("A deadline for one of your contracts is approaching.") +
    infoBox(infoRows) +
    ctaHtml,
    workspaceName
      ? `Sent by ContractGuard for workspace "${workspaceName}".`
      : undefined
  );

  return sendEmail({
    to: params.to,
    subject: `Reminder: ${contractName} — ${deadlineLabel} due ${expiryDate}`,
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
  const subject = esc(params.subject);
  const message = esc(params.message);

  let ctaHtml = "";
  if (params.actionLink) {
    ctaHtml = ctaButton(
      params.actionLink,
      params.actionText || "View Details"
    );
  }

  const html = layout(
    heading(subject) +
    bodyText(message) +
    ctaHtml
  );

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
    ? `<p style="margin:0 0 12px;font-size:13px;color:${BRAND.dim}">Reference: <strong style="color:${BRAND.muted}">${esc(params.ticketId)}</strong></p>`
    : "";

  const html = layout(
    heading(subj) +
    ticketLine +
    bodyText(
      params.message ||
        "Thank you for reaching out. Our team has received your request and will get back to you shortly."
    ),
    "This email was sent by ContractGuard Support. If you need further help, reply to this email."
  );

  return sendEmail({
    to: params.to,
    subject: subj,
    html,
    from: SENDERS.support,
    replyTo: "support@mail.contractguard.cloud",
  });
}

// ── Waitlist confirmation ───────────────────────────────────────────
export function waitlistEmailHtml(): string {
  return layout(
    heading("You're on the Pro waitlist") +
    bodyText("Thanks for joining the ContractGuard AI Pro waitlist. We'll notify you as soon as Pro is ready.") +
    infoBox([
      { label: "Early access", value: "Priority access to Pro" },
      { label: "Launch discount", value: "<strong>50% off</strong> your first month" },
      { label: "Updates", value: "Notified when Pro launches" },
    ]) +
    divider() +
    bodyText("No more missed deadlines. No more surprise renewals. Just clarity, control, and peace of mind.") +
    `<p style="margin:16px 0 0;font-size:14px;color:${BRAND.muted}">— ContractGuard AI</p>`
  );
}
