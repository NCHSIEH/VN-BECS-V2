import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

const globalResets = (global as any);
globalResets.passwordResets = globalResets.passwordResets || {};

export async function POST(request: Request) {
  try {
    const { username, email, otpCode, newPassword } = await request.json();

    if (!username || !email || !otpCode || !newPassword) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_INVALID',
        message: 'All fields are required',
        status: 400,
      });
    }

    const resetEntry = globalResets.passwordResets[username.toLowerCase()];

    if (!resetEntry) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_NOT_REQUESTED',
        message: 'No active password reset request found for this account.',
        status: 400,
      });
    }

    // Verify expiration
    if (Date.now() > resetEntry.expiresAt) {
      delete globalResets.passwordResets[username.toLowerCase()];
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_CODE_EXPIRED',
        message: 'Verification code has expired. Please request a new code.',
        status: 400,
      });
    }

    // Verify OTP code
    if (resetEntry.otpCode !== otpCode.trim()) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_CODE_INVALID',
        message: 'Invalid verification code. Please check your email or monitor overlay.',
        status: 400,
      });
    }

    // Verify email matches
    if (resetEntry.email !== email.trim().toLowerCase()) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_EMAIL_MISMATCH',
        message: 'Email verification mismatch.',
        status: 400,
      });
    }

    // Find the user by username to get ID
    const user = await db.users.getByUsername(username);
    if (!user) {
      return apiErrorResponse({
        request,
        code: 'PASSWORD_RESET_USER_NOT_FOUND',
        message: 'User registry not found.',
        status: 404,
      });
    }

    // Update password in DB (this will automatically hash the password via db.users.update)
    await db.users.update(user.id, { password: newPassword });

    // Clean up reset entry
    delete globalResets.passwordResets[username.toLowerCase()];

    // Log audit event for password reset success
    await fetch(`${new URL(request.url).origin}/api/v1/audit-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorRole: user.role,
        eventType: 'USER_PASSWORD_RESET',
        objectId: user.id,
        details: `Password securely reset for user: ${user.username}`
      })
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'PASSWORD_RESET_FAILED');
  }
}
