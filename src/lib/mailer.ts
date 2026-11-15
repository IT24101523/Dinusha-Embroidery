import nodemailer from 'nodemailer';

export async function sendDinushaOtpEmail(params: {
  to: string;
  recipientName: string;
  code: string;
  purpose: 'otp_login' | 'password_reset';
}): Promise<{ success: boolean; error?: string }> {
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT || '465');
  const smtpFrom =
    (process.env.SMTP_FROM || '').trim() || `"Dinusha Embroidery ERP" <${smtpUser}>`;

  if (!smtpUser || !smtpPass) {
    return {
      success: false,
      error:
        'Email service (SMTP_USER / SMTP_PASS) is not configured yet. Please add Gmail SMTP credentials in .env or ask Super Admin to reset your password.',
    };
  }

  const isReset = params.purpose === 'password_reset';
  const subject = isReset
    ? `Dinusha Embroidery ERP — Password Reset Code (${params.code})`
    : `Dinusha Embroidery ERP — Login Verification Code (${params.code})`;

  const heading = isReset ? 'Password Reset Verification' : 'ERP One-Time Login Code';
  const subtitle = isReset
    ? 'Use the verification code below to reset your Dinusha Embroidery ERP password.'
    : 'Use the verification code below to sign in to the Dinusha Embroidery Management System.';

  const html = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6fb; padding:32px 16px;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.06);">
      <div style="background:linear-gradient(135deg,#001a3d,#1c39bb); padding:24px; color:#ffffff;">
        <div style="font-size:18px; font-weight:800; letter-spacing:-0.2px;">Dinusha Embroidery (Pvt) Ltd</div>
        <div style="font-size:12px; color:#bfdbfe; margin-top:4px;">${heading}</div>
      </div>
      <div style="padding:24px; color:#0f172a;">
        <p style="font-size:14px; margin:0 0 12px;">Hello <strong>${params.recipientName}</strong>,</p>
        <p style="font-size:13px; color:#475569; line-height:1.6; margin:0 0 20px;">${subtitle}</p>
        <div style="background:#f8fafc; border:1px dashed #94a3b8; border-radius:12px; padding:18px; text-align:center; margin-bottom:20px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color:#64748b; font-weight:700;">6-Digit Verification Code</div>
          <div style="font-size:32px; font-weight:800; letter-spacing:8px; color:#001a3d; margin-top:6px; font-family:monospace;">${params.code}</div>
        </div>
        <p style="font-size:12px; color:#64748b; margin:0;">This code expires in <strong>10 minutes</strong>. If you did not request this, please ignore this email or inform your Factory Super Admin.</p>
      </div>
      <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px 24px; font-size:11px; color:#64748b; text-align:center;">
        Dinusha Embroidery (Pvt) Ltd • #177/5 New Kandy Rd, Weliweriya West, Sri Lanka
      </div>
    </div>
  </div>`;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: params.to,
      subject,
      text: `Dinusha Embroidery ERP\n\nHello ${params.recipientName},\nYour verification code is: ${params.code}\nThis code expires in 10 minutes.`,
      html,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email.';
    return { success: false, error: `Email delivery failed: ${message}` };
  }
}
