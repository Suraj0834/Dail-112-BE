// =============================================================================
// utils/mailer.js - Nodemailer email transport for Dial-112
// Sends OTP emails for password reset flow
// =============================================================================

'use strict';

const nodemailer = require('nodemailer');

/**
 * Create reusable transporter using SMTP env vars.
 * For Gmail, generate an App Password (not your account password):
 *   Google Account → Security → 2-Step Verification → App Passwords
 */
const transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_PORT === '465', // true for 465, false for 587
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    connectionTimeout: 10_000,  // 10s to establish TCP connection
    greetingTimeout:   10_000,  // 10s for SMTP greeting
    socketTimeout:     15_000,  // 15s of socket inactivity before giving up
});

/**
 * sendOtpEmail - Send a branded OTP email to the user.
 * @param {string} to    - Recipient email address
 * @param {string} otp   - 6-digit OTP string
 * @param {string} name  - Recipient's display name
 * @returns {Promise<void>}
 */
const sendOtpEmail = async (to, otp, name = 'User') => {
    const displayName = name.split(' ')[0]; // First name only

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dial-112 Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0A0E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background-color:#121829;
               border-radius:16px;border:1px solid rgba(255,255,255,0.12);
               overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;
                background:linear-gradient(135deg,#0D1835 0%,#1A2140 100%);">
              <div style="width:56px;height:56px;border-radius:50%;
                          background:linear-gradient(135deg,#2979FF,#7C4DFF);
                          display:inline-flex;align-items:center;
                          justify-content:center;margin-bottom:16px;">
                <span style="font-size:24px;">🛡️</span>
              </div>
              <h1 style="color:#FFFFFF;margin:0;font-size:22px;
                         font-weight:700;letter-spacing:0.5px;">DIAL 112</h1>
              <p style="color:rgba(255,255,255,0.55);margin:4px 0 0;
                        font-size:12px;letter-spacing:1px;">
                EMERGENCY RESPONSE · AI POWERED
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0 0 8px;">
                Hi <strong style="color:#FFFFFF;">${displayName}</strong>,
              </p>
              <p style="color:rgba(255,255,255,0.6);font-size:14px;
                        line-height:1.6;margin:0 0 28px;">
                We received a request to reset your Dial-112 account password.
                Use the OTP below — it expires in
                <strong style="color:#FFFFFF;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div align="center" style="margin:0 0 28px;">
                <div style="display:inline-block;background:linear-gradient(135deg,#2979FF,#7C4DFF);
                            border-radius:12px;padding:2px;">
                  <div style="background:#0D1526;border-radius:10px;padding:20px 48px;">
                    <span style="font-size:42px;font-weight:800;letter-spacing:14px;
                                 color:#FFFFFF;font-family:monospace;">${otp}</span>
                  </div>
                </div>
              </div>

              <p style="color:rgba(255,255,255,0.45);font-size:13px;
                        line-height:1.6;margin:0;">
                If you did not request this, please <strong>ignore this email</strong>
                — your account remains secure. Never share this OTP with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="color:rgba(255,255,255,0.3);font-size:11px;
                        text-align:center;margin:0;">
                Dial-112 · Ministry of Home Affairs · Emergency Response System<br/>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from:    `"Dial-112 Security" <${process.env.MAIL_USER}>`,
        to,
        subject: `${otp} is your Dial-112 password reset OTP`,
        html:    htmlContent,
        text:    `Hi ${displayName},\n\nYour Dial-112 password reset OTP is: ${otp}\n\nThis OTP expires in 10 minutes. If you did not request this, please ignore this email.\n\n— Dial-112 Team`,
    });
};

module.exports = { sendOtpEmail };
