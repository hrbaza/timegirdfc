/* =========================================================================
   Time Grid FC — email sender (provider-agnostic SMTP)
   Configure via env vars (any SMTP works — Gmail, Brevo, SendGrid, Mailgun…):
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
   If SMTP is not configured, emails are logged to the server console instead
   (so the OTP flow is testable in development without an email provider).
   ========================================================================= */
let nodemailer = null;
try { nodemailer = require("nodemailer"); } catch (e) { /* optional dependency */ }

let transporter;
function getTransport() {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!nodemailer || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) { transporter = null; return null; }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function isConfigured() { return !!getTransport(); }

// Test the SMTP connection + auth without sending an email (for diagnostics).
async function verify() {
  const t = getTransport();
  if (!t) return { configured: false };
  try { await t.verify(); return { configured: true, ok: true }; }
  catch (e) { return { configured: true, ok: false, error: e.message }; }
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "Time Grid FC <no-reply@timegridfc.com>";
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — email NOT sent. Would send to ${to}:\n  Subject: ${subject}\n  ${text}\n`);
    return { delivered: false, dev: true };
  }
  await t.sendMail({ from, to, subject, text, html });
  return { delivered: true, dev: false };
}

module.exports = { sendMail, isConfigured, verify };
