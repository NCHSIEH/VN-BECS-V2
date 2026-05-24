import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { verifyPassword } from '@/src/server/crypto';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Emergency Admin Fallback (works even if DB is empty or down)
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
       return NextResponse.json({
         id: 'U-EMERGENCY',
         username: 'admin',
         role: 'Admin',
         orgId: 'HUB-01',
         orgName: 'System Emergency Hub',
         orgType: 'Hub',
         permittedSystems: ['MDM', 'IAM', 'HUB', 'LIMS', 'LAB', 'HOSPITAL', 'NATIONAL', 'DASHBOARD']
       });
    }

    const user = await db.users.getByUsername(username);

    if (!user) {
      console.log(`Login failed: User "${username}" not found`);
      return NextResponse.json({ error: 'User not found or database unreachable' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      console.log(`Login failed: Invalid password for "${username}"`);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
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

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      orgId: user.orgId,
      orgName: user.orgName,
      orgType: user.orgType,
      photoUrl: user.photoUrl,
      details: user.details,
      permittedSystems
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
