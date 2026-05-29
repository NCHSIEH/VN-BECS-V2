import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { verifyPassword } from '@/src/server/crypto';
import { isDemoLoginAllowed } from '@/src/server/authPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';
import { issueSessionToken } from '@/src/server/session';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    const demoLoginAllowed = isDemoLoginAllowed();

    // Emergency Admin Fallback for non-production/demo environments.
    if (demoLoginAllowed && username.toLowerCase() === 'admin' && password === 'admin123') {
       const sessionToken = issueSessionToken({ sub: 'U-EMERGENCY', username: 'admin', role: 'Admin', orgId: 'HUB-01' });
       return NextResponse.json({
         id: 'U-EMERGENCY',
         username: 'admin',
         role: 'Admin',
         orgId: 'HUB-01',
         orgName: 'System Emergency Hub',
         orgType: 'Hub',
         permittedSystems: ['MDM', 'IAM', 'HUB', 'LIMS', 'LAB', 'HOSPITAL', 'NATIONAL', 'DASHBOARD'],
         sessionToken,
         clinicalDisclaimer: 'WARNING: This pilot/demo system is NOT authorized for live clinical/transfusion decision-making until all production safety gates are completed.'
       });
    }

    // Emergency Test Superuser Fallback 'a' / 'a' for local testing.
    if (demoLoginAllowed && username.toLowerCase() === 'a' && password === 'a') {
       const sessionToken = issueSessionToken({ sub: 'U-TEST-SUPERUSER', username: 'a', role: 'Admin', orgId: 'HUB-01' });
       return NextResponse.json({
         id: 'U-TEST-SUPERUSER',
         username: 'a',
         role: 'Admin',
         orgId: 'HUB-01',
         orgName: 'Test Emergency Hub',
         orgType: 'Hub',
         permittedSystems: ['MDM', 'IAM', 'HUB', 'LIMS', 'LAB', 'HOSPITAL', 'NATIONAL', 'DASHBOARD'],
         sessionToken,
         clinicalDisclaimer: 'WARNING: This pilot/demo system is NOT authorized for live clinical/transfusion decision-making until all production safety gates are completed.'
       });
    }

    const user = await db.users.getByUsername(username);

    if (!user) {
      console.log(`Login failed: User "${username}" not found. Active Supabase URL in use: "${process.env.NEXT_PUBLIC_SUPABASE_URL}"`);
      return apiErrorResponse({
        request,
        code: 'LOGIN_INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        status: 401,
      });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      console.log(`Login failed: Invalid password for "${username}"`);
      return apiErrorResponse({
        request,
        code: 'LOGIN_INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        status: 401,
      });
    }
    
    const permittedSystems: string[] = [];
    
    // Global Admin
    if (user.role === 'Admin') {
       permittedSystems.push('MDM', 'IAM', 'HUB', 'LIMS', 'LAB', 'HOSPITAL', 'NATIONAL', 'DASHBOARD');
    } else {
       // Role-based defaults
       if (['HospitalOperator', 'Nurse', 'Doctor'].includes(user.role)) {
          permittedSystems.push('HOSPITAL', 'HUB', 'LIMS');
       }
       if (['WarehouseIssuer', 'Dispatcher', 'HubDispatcher', 'Courier'].includes(user.role)) {
          permittedSystems.push('HUB');
       }
       if (['LabTech', 'MedicalReviewer'].includes(user.role)) {
          permittedSystems.push('LIMS', 'LAB', 'HUB');
       }
       if (['Manager', 'NationalCommander', 'Auditor'].includes(user.role)) {
          permittedSystems.push('NATIONAL', 'HUB', 'LIMS', 'LAB', 'HOSPITAL');
       }
    }

    // Issue a signed, server-verifiable session token. This — not a
    // client-supplied header — becomes the authoritative source of the
    // actor's identity and role for all subsequent high-risk API calls.
    const sessionToken = issueSessionToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      orgId: user.orgId,
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      orgId: user.orgId,
      orgName: user.orgName,
      orgType: user.orgType,
      photoUrl: user.photoUrl,
      details: user.details,
      permittedSystems,
      sessionToken,
      clinicalDisclaimer: 'WARNING: This pilot/demo system is NOT authorized for live clinical/transfusion decision-making until all production safety gates are completed.'
    });
  } catch (error) {
    return internalErrorResponse(request, error, 'LOGIN_FAILED');
  }
}
