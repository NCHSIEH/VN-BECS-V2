import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

const globalResets = (global as any);
globalResets.passwordResets = globalResets.passwordResets || {};

export async function POST(request: Request) {
  try {
    const { username, email, otpCode, newPassword } = await request.json();

    if (!username || !email || !otpCode || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const resetEntry = globalResets.passwordResets[username.toLowerCase()];

    if (!resetEntry) {
      return NextResponse.json({ error: 'No active password reset request found for this account.' }, { status: 400 });
    }

    // Verify expiration
    if (Date.now() > resetEntry.expiresAt) {
      delete globalResets.passwordResets[username.toLowerCase()];
      return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
    }

    // Verify OTP code
    if (resetEntry.otpCode !== otpCode.trim()) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your email or monitor overlay.' }, { status: 400 });
    }

    // Verify email matches
    if (resetEntry.email !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Email verification mismatch.' }, { status: 400 });
    }

    // Find the user by username to get ID
    const user = await db.users.getByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User registry not found.' }, { status: 404 });
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
    console.error('Reset Password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
