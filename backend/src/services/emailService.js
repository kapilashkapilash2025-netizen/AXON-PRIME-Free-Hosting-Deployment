import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;
const isPlaceholder = (value = '') =>
  ['your_smtp_user', 'your_smtp_pass', 'smtp.mailtrap.io'].includes(String(value).trim());

if (
  env.smtpHost &&
  env.smtpUser &&
  env.smtpPass &&
  !isPlaceholder(env.smtpHost) &&
  !isPlaceholder(env.smtpUser) &&
  !isPlaceholder(env.smtpPass)
) {
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass }
  });
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${env.appUrl}/verify-email?token=${token}`;

  if (!transporter) {
    console.log(`[DEV EMAIL] Verification link for ${email}: ${verifyUrl}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.smtpFrom,
      to: email,
      subject: 'Verify your AXON PRIME account',
      text: `Verify your account: ${verifyUrl}`,
      html: `<p>Verify your AXON PRIME account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
    });
  } catch (error) {
    console.warn(`[EMAIL FALLBACK] SMTP send failed for ${email}. Using console link.`);
    console.log(`[DEV EMAIL] Verification link for ${email}: ${verifyUrl}`);
  }
}
