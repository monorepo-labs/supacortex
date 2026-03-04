import "server-only";

import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from "@getbrevo/brevo";

const emailApi = new TransactionalEmailsApi();
emailApi.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || "",
);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set, skipping email send");
    return null;
  }

  try {
    const result = await emailApi.sendTransacEmail({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "Supacortex",
        email: process.env.EMAIL_FROM_ADDRESS,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    });
    console.log(`Email sent to ${to}:`, result.body.messageId);
    return result.body;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password by visiting: ${resetUrl}`,
  });
}
