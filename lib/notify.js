import nodemailer from 'nodemailer';
export const appUrl = () => process.env.APP_URL || 'http://localhost:3000';
export async function sendMail(to, subject, text) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!to || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) { console.log('[mail skipped: SMTP not set up]', subject); return; }
  try {
    const port = Number(SMTP_PORT) || 465;
    const t = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
    await t.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text });
  } catch (e) { console.error('[mail failed]', e.message); }
}
