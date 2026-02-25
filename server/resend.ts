import { Resend } from 'resend';

function getCredentials() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error(
      'RESEND_API_KEY and RESEND_FROM_EMAIL must be set. Get them from resend.com/api-keys'
    );
  }
  return { apiKey, fromEmail };
}

// WARNING: Never cache this client.
// Always call this function again to get a fresh client.
export function getUncachableResendClient() {
  const { apiKey, fromEmail } = getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code email
export async function sendVerificationEmail(email: string, code: string) {
  const { client, fromEmail } = getUncachableResendClient();

  const { data, error } = await client.emails.send({
    from: `BowlingAlleys.io <${fromEmail}>`,
    to: email,
    subject: 'Your BowlingAlleys.io Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to BowlingAlleys.io!</h1>
        <p style="font-size: 16px; color: #555;">Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #777;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  return data;
}

// Send custom email
export async function sendCustomEmail(to: string, subject: string, html: string) {
  const { client, fromEmail } = getUncachableResendClient();

  const { data, error } = await client.emails.send({
    from: `BowlingAlleys.io <${fromEmail}>`,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
