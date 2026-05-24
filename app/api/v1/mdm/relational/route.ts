import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { supabase } from '@/src/lib/supabaseClient';
import { verifyPassword } from '@/src/server/crypto';

function isValidToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const rawToken = token.replace('Bearer ', '').trim();
    if (!rawToken.startsWith('SESSION-')) return false;
    const base64Str = rawToken.replace('SESSION-', '');
    const decoded = Buffer.from(base64Str, 'base64').toString('utf8');
    const [username, timestamp] = decoded.split(':');
    if (!username || !timestamp) return false;
    // Expiration: 2 hours
    const elapsed = Date.now() - parseInt(timestamp);
    if (elapsed < 0 || elapsed > 2 * 60 * 60 * 1000) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const errMsg = error.message || '';
  const errCode = error.code || '';
  return (
    errCode === 'PGRST205' ||
    errMsg.includes('Could not find') ||
    errMsg.includes('relation') ||
    errMsg.includes('does not exist') ||
    errMsg.includes('schema cache')
  );
}

function getPkField(table: string): string {
  if (table === 'product_catalog') return 'productCode';
  if (table === 'inventory') return 'unitId';
  if (table === 'transport_jobs') return 'orderId';
  return 'id';
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-superuser-token');
    if (!isValidToken(authHeader)) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Access Denied: Missing or expired Superuser session token.' }, { status: 401 });
    }

    const [
      organizations, users, resources, rare_donors,
      donors, questionnaires, donations, labTests, components,
      patients, orders, crossmatch, transfusions, adverseReactions,
      productCatalog, inventory, transportJobs
    ] = await Promise.all([
      db.organizations.getAll().catch(() => []),
      db.users.getAll().catch(() => []),
      db.resources.getAll().catch(() => []),
      db.rareDonors.getAll().catch(() => []),
      db.donors.getAll().catch(() => []),
      db.questionnaires.getAll().catch(() => []),
      db.donations.getAll().catch(() => []),
      db.labTests.getAll().catch(() => []),
      db.components.getAll().catch(() => []),
      db.patients.getAll().catch(() => []),
      db.orders.getAll().catch(() => []),
      db.crossmatch.getAll().catch(() => []),
      db.transfusions.getAll().catch(() => []),
      db.adverseReactions.getAll().catch(() => []),
      db.productCatalog.getAll().catch(() => []),
      db.inventory.getAll().catch(() => []),
      db.transportJobs.getAll().catch(() => [])
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organizations,
        users,
        resources,
        rare_donors,
        donors,
        questionnaires,
        donations,
        lab_tests: labTests,
        components,
        patients,
        orders,
        crossmatch,
        transfusions,
        adverse_reactions: adverseReactions,
        product_catalog: productCatalog,
        inventory,
        transport_jobs: transportJobs
      }
    });
  } catch (error: any) {
    console.error("GET Relational Data error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Dynamic Superuser Authenticator Challenge
    if (action === 'auth') {
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
      }

      // Emergency fallback credentials
      if (username.toLowerCase() === 'admin' && password === 'admin123') {
        const token = 'SESSION-' + Buffer.from(`admin:${Date.now()}`).toString('base64');
        return NextResponse.json({
          success: true,
          token,
          user: {
            id: 'USR-EMERGENCY',
            username: 'admin',
            role: 'Admin',
            orgName: 'Emergency Command System'
          }
        });
      }

      const user = await db.users.getByUsername(username);

      if (!user) {
        return NextResponse.json({ error: 'User not found or database unreachable' }, { status: 401 });
      }

      if (!verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      if (user.role !== 'Admin') {
        return NextResponse.json({ 
          error: 'Access Denied: Only users with the highest administrative role (Admin) can access the Superuser Terminal.' 
        }, { status: 403 });
      }

      const token = 'SESSION-' + Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          orgName: user.orgName
        }
      });
    }

    // 2. Relational Transactional Mutation Engine (insert, update, delete)
    if (action === 'mutation') {
      const authHeader = request.headers.get('Authorization') || request.headers.get('x-superuser-token');
      if (!isValidToken(authHeader)) {
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Access Denied: Missing or expired Superuser session token.' }, { status: 401 });
      }

      const { type, table, rowId, data } = body;

      if (!type || !table || !rowId) {
        return NextResponse.json({ error: 'Missing mutation parameters' }, { status: 400 });
      }

      // Fetch fresh data for validation
      const [
        organizations, users, resources, rare_donors,
        donors, questionnaires, donations, labTests, components,
        patients, orders, crossmatch, transfusions, adverseReactions,
        productCatalog, inventory, transportJobs
      ] = await Promise.all([
        db.organizations.getAll().catch(() => []),
        db.users.getAll().catch(() => []),
        db.resources.getAll().catch(() => []),
        db.rareDonors.getAll().catch(() => []),
        db.donors.getAll().catch(() => []),
        db.questionnaires.getAll().catch(() => []),
        db.donations.getAll().catch(() => []),
        db.labTests.getAll().catch(() => []),
        db.components.getAll().catch(() => []),
        db.patients.getAll().catch(() => []),
        db.orders.getAll().catch(() => []),
        db.crossmatch.getAll().catch(() => []),
        db.transfusions.getAll().catch(() => []),
        db.adverseReactions.getAll().catch(() => []),
        db.productCatalog.getAll().catch(() => []),
        db.inventory.getAll().catch(() => []),
        db.transportJobs.getAll().catch(() => [])
      ]);

      const datasets: Record<string, any[]> = {
        organizations,
        users,
        resources,
        rare_donors,
        donors,
        questionnaires,
        donations,
        lab_tests: labTests,
        components,
        patients,
        orders,
        crossmatch,
        transfusions,
        adverse_reactions: adverseReactions,
        product_catalog: productCatalog,
        inventory,
        transport_jobs: transportJobs
      };

      const dbMap: Record<string, any> = {
        organizations: db.organizations,
        users: db.users,
        resources: db.resources,
        rare_donors: db.rareDonors,
        donors: db.donors,
        questionnaires: db.questionnaires,
        donations: db.donations,
        lab_tests: db.labTests,
        components: db.components,
        patients: db.patients,
        orders: db.orders,
        crossmatch: db.crossmatch,
        transfusions: db.transfusions,
        adverse_reactions: db.adverseReactions,
        product_catalog: db.productCatalog,
        inventory: db.inventory,
        transport_jobs: db.transportJobs
      };

      const targetDb = dbMap[table];
      if (!targetDb) {
        return NextResponse.json({ error: `Table '${table}' not supported` }, { status: 400 });
      }

      // --- CONSTRAINT ENGINE ---

      // A. INSERT validations
      if (type === 'insert') {
        // A1. PK Uniqueness check
        const idExists = datasets[table].some((row: any) => {
          const pkField = table === 'product_catalog' ? 'productCode' : 'id';
          return row[pkField] === rowId;
        });
        if (idExists) {
          return NextResponse.json({
            error: 'PRIMARY_KEY_VIOLATION',
            message: `Primary key violation: Record with ID '${rowId}' already exists in table '${table}'.`
          }, { status: 400 });
        }

        // A2. FK referential integrity checks
        if (table === 'users' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'rare_donors' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'resources' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'questionnaires' && data.donorId) {
          const donorExists = donors.some((d: any) => d.id === data.donorId);
          if (!donorExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donor ID '${data.donorId}' does not exist in 'donors'.`
            }, { status: 400 });
          }
        }

        if (table === 'donations') {
          if (data.donorId) {
            const donorExists = donors.some((d: any) => d.id === data.donorId);
            if (!donorExists) {
              return NextResponse.json({
                error: 'FOREIGN_KEY_VIOLATION',
                message: `Foreign Key Violation: Donor ID '${data.donorId}' does not exist in 'donors'.`
              }, { status: 400 });
            }
          }
          if (data.questionnaireId) {
            const questExists = questionnaires.some((q: any) => q.id === data.questionnaireId);
            if (!questExists) {
              return NextResponse.json({
                error: 'FOREIGN_KEY_VIOLATION',
                message: `Foreign Key Violation: Questionnaire ID '${data.questionnaireId}' does not exist in 'questionnaires'.`
              }, { status: 400 });
            }
          }
        }

        if (table === 'lab_tests' && data.donationId) {
          const donationExists = donations.some((d: any) => d.id === data.donationId);
          if (!donationExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donation ID '${data.donationId}' does not exist in 'donations'.`
            }, { status: 400 });
          }
        }

        if (table === 'components' && data.donationId) {
          const donationExists = donations.some((d: any) => d.id === data.donationId);
          if (!donationExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donation ID '${data.donationId}' does not exist in 'donations'.`
            }, { status: 400 });
          }
        }

        if (table === 'orders' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'crossmatch' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'transfusions' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'adverse_reactions' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'inventory' && data.productCode) {
          const productExists = productCatalog.some((p: any) => p.productCode === data.productCode);
          if (!productExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Product Code '${data.productCode}' does not exist in 'product_catalog'.`
            }, { status: 400 });
          }
        }

        if (table === 'transport_jobs' && data.orderId) {
          const orderExists = orders.some((o: any) => o.id === data.orderId);
          if (!orderExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Order ID '${data.orderId}' does not exist in 'orders'.`
            }, { status: 400 });
          }
        }

        // Run insert
        if (targetDb.create) {
          await targetDb.create({ id: rowId, ...data });
        } else {
          const pkField = getPkField(table);
          const payload = { [pkField]: rowId, ...data };
          if (table === 'orders') {
            if (payload.items && typeof payload.items !== 'string') payload.items = JSON.stringify(payload.items);
            if (payload.allocatedUnits && typeof payload.allocatedUnits !== 'string') payload.allocatedUnits = JSON.stringify(payload.allocatedUnits);
          }
          if (table === 'transport_jobs') {
            if (payload.readings && typeof payload.readings !== 'string') payload.readings = JSON.stringify(payload.readings);
          }

          try {
            const { error } = await supabase.from(table).insert(payload);
            if (error) {
              if (isTableMissingError(error)) {
                db.fallbackStores[table].push(payload);
              } else {
                throw error;
              }
            }
          } catch (e) {
            if (isTableMissingError(e)) {
              db.fallbackStores[table].push(payload);
            } else {
              throw e;
            }
          }
        }
        return NextResponse.json({ success: true });
      }

      // B. UPDATE validations
      if (type === 'update') {
        // B1. FK referential integrity checks (on fields modified)
        if (table === 'users' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'rare_donors' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'resources' && data.orgId) {
          const orgExists = organizations.some((o: any) => o.id === data.orgId);
          if (!orgExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Organization ID '${data.orgId}' does not exist in 'organizations'.`
            }, { status: 400 });
          }
        }

        if (table === 'questionnaires' && data.donorId) {
          const donorExists = donors.some((d: any) => d.id === data.donorId);
          if (!donorExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donor ID '${data.donorId}' does not exist in 'donors'.`
            }, { status: 400 });
          }
        }

        if (table === 'donations') {
          if (data.donorId) {
            const donorExists = donors.some((d: any) => d.id === data.donorId);
            if (!donorExists) {
              return NextResponse.json({
                error: 'FOREIGN_KEY_VIOLATION',
                message: `Foreign Key Violation: Donor ID '${data.donorId}' does not exist in 'donors'.`
              }, { status: 400 });
            }
          }
          if (data.questionnaireId) {
            const questExists = questionnaires.some((q: any) => q.id === data.questionnaireId);
            if (!questExists) {
              return NextResponse.json({
                error: 'FOREIGN_KEY_VIOLATION',
                message: `Foreign Key Violation: Questionnaire ID '${data.questionnaireId}' does not exist in 'questionnaires'.`
              }, { status: 400 });
            }
          }
        }

        if (table === 'lab_tests' && data.donationId) {
          const donationExists = donations.some((d: any) => d.id === data.donationId);
          if (!donationExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donation ID '${data.donationId}' does not exist in 'donations'.`
            }, { status: 400 });
          }
        }

        if (table === 'components' && data.donationId) {
          const donationExists = donations.some((d: any) => d.id === data.donationId);
          if (!donationExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Donation ID '${data.donationId}' does not exist in 'donations'.`
            }, { status: 400 });
          }
        }

        if (table === 'orders' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'crossmatch' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'transfusions' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'adverse_reactions' && data.patientId) {
          const patientExists = patients.some((p: any) => p.id === data.patientId);
          if (!patientExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Patient ID '${data.patientId}' does not exist in 'patients'.`
            }, { status: 400 });
          }
        }

        if (table === 'inventory' && data.productCode) {
          const productExists = productCatalog.some((p: any) => p.productCode === data.productCode);
          if (!productExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Product Code '${data.productCode}' does not exist in 'product_catalog'.`
            }, { status: 400 });
          }
        }

        if (table === 'transport_jobs' && data.orderId) {
          const orderExists = orders.some((o: any) => o.id === data.orderId);
          if (!orderExists) {
            return NextResponse.json({
              error: 'FOREIGN_KEY_VIOLATION',
              message: `Foreign Key Violation: Order ID '${data.orderId}' does not exist in 'orders'.`
            }, { status: 400 });
          }
        }

        // Run update
        if (targetDb.update) {
          await targetDb.update(rowId, data);
        } else {
          const pkField = getPkField(table);
          const payload = { ...data };
          if (table === 'orders') {
            if (payload.items && typeof payload.items !== 'string') payload.items = JSON.stringify(payload.items);
            if (payload.allocatedUnits && typeof payload.allocatedUnits !== 'string') payload.allocatedUnits = JSON.stringify(payload.allocatedUnits);
          }
          if (table === 'transport_jobs') {
            if (payload.readings && typeof payload.readings !== 'string') payload.readings = JSON.stringify(payload.readings);
          }

          try {
            const { error } = await supabase.from(table).update(payload).eq(pkField, rowId);
            if (error) {
              if (isTableMissingError(error)) {
                const item = db.fallbackStores[table].find((x: any) => x[pkField] === rowId);
                if (item) Object.assign(item, payload);
              } else {
                throw error;
              }
            }
          } catch (e) {
            if (isTableMissingError(e)) {
              const item = db.fallbackStores[table].find((x: any) => x[pkField] === rowId);
              if (item) Object.assign(item, payload);
            } else {
              throw e;
            }
          }
        }
        return NextResponse.json({ success: true });
      }

      // C. DELETE validations (Restrict Cascade blocks)
      if (type === 'delete') {
        if (table === 'organizations') {
          const referencingUsers = users.filter((u: any) => u.orgId === rowId);
          const referencingRares = rare_donors.filter((r: any) => r.orgId === rowId);
          const referencingRes = resources.filter((r: any) => r.orgId === rowId);
          if (referencingUsers.length > 0 || referencingRares.length > 0 || referencingRes.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete organization '${rowId}'. It is referenced by active users, resources, or rare donors.`
            }, { status: 400 });
          }
        }

        if (table === 'donors') {
          const referencingQuests = questionnaires.filter((q: any) => q.donorId === rowId);
          const referencingDonations = donations.filter((d: any) => d.donorId === rowId);
          if (referencingQuests.length > 0 || referencingDonations.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete donor '${rowId}'. It is referenced by questionnaires or active donations.`
            }, { status: 400 });
          }
        }

        if (table === 'questionnaires') {
          const referencingDonations = donations.filter((d: any) => d.questionnaireId === rowId);
          if (referencingDonations.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete questionnaire '${rowId}'. It is referenced by active donations.`
            }, { status: 400 });
          }
        }

        if (table === 'donations') {
          const referencingTests = labTests.filter((t: any) => t.donationId === rowId);
          const referencingComps = components.filter((c: any) => c.donationId === rowId);
          if (referencingTests.length > 0 || referencingComps.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete donation '${rowId}'. It is referenced by active lab tests or components.`
            }, { status: 400 });
          }
        }

        if (table === 'patients') {
          const referencingOrders = orders.filter((o: any) => o.patientId === rowId);
          const referencingXM = crossmatch.filter((x: any) => x.patientId === rowId);
          const referencingTF = transfusions.filter((t: any) => t.patientId === rowId);
          const referencingAR = adverseReactions.filter((a: any) => a.patientId === rowId);
          
          if (referencingOrders.length > 0 || referencingXM.length > 0 || referencingTF.length > 0 || referencingAR.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete patient '${rowId}'. It is referenced by active clinical orders, crossmatches, transfusions, or adverse reactions.`
            }, { status: 400 });
          }
        }

        if (table === 'product_catalog') {
          const referencingInv = inventory.filter((i: any) => i.productCode === rowId);
          if (referencingInv.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete product catalog item '${rowId}'. It is referenced in blood inventory.`
            }, { status: 400 });
          }
        }

        if (table === 'orders') {
          const referencingJobs = transportJobs.filter((j: any) => j.orderId === rowId);
          if (referencingJobs.length > 0) {
            return NextResponse.json({
              error: 'DELETE_RESTRICTED',
              message: `Delete Restricted: Cannot delete order '${rowId}'. It has active transport/delivery jobs assigned.`
            }, { status: 400 });
          }
        }

        // Run delete
        if (targetDb.remove) {
          await targetDb.remove(rowId);
        } else {
          const pkField = getPkField(table);
          try {
            const { error } = await supabase.from(table).delete().eq(pkField, rowId);
            if (error) {
              if (isTableMissingError(error)) {
                const idx = db.fallbackStores[table].findIndex((x: any) => x[pkField] === rowId);
                if (idx >= 0) db.fallbackStores[table].splice(idx, 1);
              } else {
                throw error;
              }
            }
          } catch (e) {
            if (isTableMissingError(e)) {
              const idx = db.fallbackStores[table].findIndex((x: any) => x[pkField] === rowId);
              if (idx >= 0) db.fallbackStores[table].splice(idx, 1);
            } else {
              throw e;
            }
          }
        }
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid relational action' }, { status: 400 });
  } catch (error: any) {
    console.error("Relational API Mutation error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
