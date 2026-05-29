import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import nodemailer from 'nodemailer';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

// Global server-side in-memory store for verification codes (immune to DB downtime)
const globalResets = (global as any);
globalResets.passwordResets = globalResets.passwordResets || {};

export async function POST(request: Request) {
  try {
    const { username, email } = await request.json();

    if (!username || !email) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_REQUEST_INVALID',
        message: 'Username and Email are required',
        status: 400,
      });
    }

    const user = await db.users.getByUsername(username);

    if (!user) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_IDENTITY_NOT_FOUND',
        message: 'User identity not found in VN-BECS registry.',
        status: 404,
      });
    }

    // Verify email matches the user details
    const userEmail = (user.details?.email || '').trim().toLowerCase();
    if (!userEmail || userEmail !== email.trim().toLowerCase()) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_EMAIL_MISMATCH',
        message: 'Provided email does not match our command records for this account.',
        status: 400,
      });
    }

    // Generate a secure 6-digit OTP code
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    
    // Store in global memory (expires in 15 minutes)
    globalResets.passwordResets[username.toLowerCase()] = {
      otpCode,
      email: email.trim().toLowerCase(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    };

    // Log superuser audit event for password reset request
    await fetch(`${new URL(request.url).origin}/api/v1/audit-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorRole: user.role,
        eventType: 'PASSWORD_RESET_REQUESTED',
        objectId: user.id,
        details: `Password reset OTP generated for ${user.username} (Recipient: ${email})`
      })
    }).catch(() => {});

    // Try sending email if SMTP is configured
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    if (smtpHost && smtpUser) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"VN-BECS Support" <${smtpUser}>`,
          to: email,
          subject: '[VN-BECS] Secure Password Reset OTP Code',
          text: `You requested a password reset for your VN-BECS account.\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
              <h2 style="color: #e11d48; margin-bottom: 24px; text-transform: uppercase; font-style: italic;">VN-BECS Command Access Reset</h2>
              <p>You requested a secure password reset for your VN-BECS account (<strong>${username}</strong>).</p>
              <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #1e293b; font-family: monospace;">${otpCode}</span>
              </div>
              <p style="color: #64748b; font-size: 12px;">This verification code will expire in 15 minutes. If you did not request this reset, please ignore this email.</p>
            </div>
          `
        });

        return NextResponse.json({ success: true, simulation: false });
      } catch (err: any) {
        console.error('SMTP Delivery failed, falling back to simulated overlay:', err);
        return NextResponse.json({ success: true, simulation: true, otpCode });
      }
    }

    // No SMTP config: return simulation mode (safely reveals OTP in front-end monitor overlay)
    return NextResponse.json({ success: true, simulation: true, otpCode });
  } catch (error: any) {
    console.error('Forgot Password Request error:', error);
    return internalErrorResponse(request, error, 'PASSWORD_RESET_REQUEST_FAILED');
  }
}
