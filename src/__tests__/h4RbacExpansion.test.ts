import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import handlers to test
import { GET as getRelational, POST as postRelational } from '../../app/api/v1/mdm/relational/route';
import { GET as getUsers, POST as postUsers } from '../../app/api/v1/mdm/users/route';
import { GET as getOrgs, POST as postOrgs } from '../../app/api/v1/mdm/organizations/route';
import { GET as getProducts } from '../../app/api/v1/catalog/products/route';
import { GET as getResources, POST as postResources } from '../../app/api/v1/resources/route';
import { GET as getResourceById, PATCH as patchResourceById } from '../../app/api/v1/resources/[id]/route';
import { GET as getStats } from '../../app/api/v1/stats/route';
import { GET as getSyncPull } from '../../app/api/v1/sync/pull-changes/route';
import { POST as postSyncPush } from '../../app/api/v1/sync/push-events/route';
import { GET as getAudit, POST as postAudit } from '../../app/api/v1/audit-events/route';
import { POST as postCollect } from '../../app/api/v1/lims/collect/route';
import { POST as postProcessComponent } from '../../app/api/v1/lims/process-component/[id]/route';
import { POST as postLabTestsAuth } from '../../app/api/v1/lims/lab-tests/[id]/auth/route';
import { POST as postLabTestsRun } from '../../app/api/v1/lims/lab-tests/[id]/run/route';
import { POST as postComponentRelease } from '../../app/api/v1/lims/components/[id]/release/route';
import { GET as getDonations, POST as postDonations } from '../../app/api/v1/lims/donations/route';
import { GET as getDonors, POST as postDonors } from '../../app/api/v1/lims/donors/route';
import { GET as getQueues, POST as postQueues } from '../../app/api/v1/lims/queues/route';
import { PUT as putQueue, DELETE as deleteQueue } from '../../app/api/v1/lims/queues/[id]/route';
import { GET as getQuestionnaires } from '../../app/api/v1/lims/questionnaires/route';
import { GET as getComponents } from '../../app/api/v1/lims/components/route';

// Hoist database mocks to prevent Vitest strict proxy errors
const mockDb = vi.hoisted(() => ({
  organizations: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  users: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    getByUsername: vi.fn().mockResolvedValue(null),
  },
  resources: {
    getAll: vi.fn().mockResolvedValue([]),
    getByType: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateStatus: vi.fn().mockResolvedValue({}),
    updateStock: vi.fn().mockResolvedValue({}),
  },
  rareDonors: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  rare_donors: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  donors: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
  questionnaires: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
  donations: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
  labTests: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateByDonationId: vi.fn().mockResolvedValue({}),
  },
  lab_tests: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateByDonationId: vi.fn().mockResolvedValue({}),
  },
  components: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateStatus: vi.fn().mockResolvedValue({}),
  },
  patients: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  orders: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  crossmatch: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  transfusions: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  adverseReactions: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  adverse_reactions: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  productCatalog: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  product_catalog: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  inventory: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateStatusWithLock: vi.fn().mockResolvedValue({}),
  },
  transportJobs: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  limsQueues: {
    getAll: vi.fn().mockResolvedValue([]),
    getByOrg: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  },
  offlineEvents: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
  auditEvents: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
  audit_events: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

describe('Slice H4: RBAC Matrix Expansion Tests', () => {
  const originalRbacFlag = process.env.VN_BECS_ENFORCE_API_RBAC;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.VN_BECS_ENFORCE_API_RBAC = originalRbacFlag;
  });

  function makeRequest(url: string, method: string, role?: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (role) {
      headers['x-actor-role'] = role;
    }
    return new Request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe('Enforcement Mode (VN_BECS_ENFORCE_API_RBAC=true)', () => {
    beforeEach(() => {
      process.env.VN_BECS_ENFORCE_API_RBAC = 'true';
    });

    it('blocks unauthorized and permits authorized roles on MDM Relational (Superuser mutation)', async () => {
      // Unauthorized role -> blocks
      const reqBlock = makeRequest('http://localhost/api/v1/mdm/relational', 'POST', 'Nurse', {
        action: 'mutation',
        type: 'insert',
        table: 'users',
        rowId: 'USR-1',
        data: {},
      });
      const resBlock = await postRelational(reqBlock);
      expect(resBlock.status).toBe(403);
      const bodyBlock = await resBlock.json();
      expect(bodyBlock.error).toBe('FORBIDDEN');
      expect(bodyBlock.code).toBe('ROLE_NOT_ALLOWED');

      // Authorized role (Admin) -> lets it pass to inner validation
      const reqPass = makeRequest('http://localhost/api/v1/mdm/relational', 'POST', 'Admin', {
        action: 'mutation',
        type: 'insert',
        table: 'users',
        rowId: 'USR-1',
        data: {},
      });
      const resPass = await postRelational(reqPass);
      // Bypasses RBAC, fails on invalid session token inside the handler (returns 401)
      expect(resPass.status).toBe(401);
    });

    it('blocks unauthorized and permits authorized roles on resources GET/POST', async () => {
      // Unauthorized GET -> blocks
      const reqGetBlock = makeRequest('http://localhost/api/v1/resources', 'GET', 'Courier');
      const resGetBlock = await getResources(reqGetBlock);
      expect(resGetBlock.status).toBe(403);

      // Authorized GET -> permits (returns 200 list)
      const reqGetPass = makeRequest('http://localhost/api/v1/resources', 'GET', 'Dispatcher');
      const resGetPass = await getResources(reqGetPass);
      expect(resGetPass.status).toBe(200);

      // Unauthorized POST -> blocks
      const reqPostBlock = makeRequest('http://localhost/api/v1/resources', 'POST', 'QA_Officer', { name: 'Device A' });
      const resPostBlock = await postResources(reqPostBlock);
      expect(resPostBlock.status).toBe(403);

      // Authorized POST -> permits (returns 200 success)
      const reqPostPass = makeRequest('http://localhost/api/v1/resources', 'POST', 'Resource', { name: 'Device A' });
      const resPostPass = await postResources(reqPostPass);
      expect(resPostPass.status).toBe(200);
    });

    it('blocks unauthorized and permits authorized roles on stats GET', async () => {
      const reqBlock = makeRequest('http://localhost/api/v1/stats', 'GET', 'Courier');
      const resBlock = await getStats(reqBlock);
      expect(resBlock.status).toBe(403);

      const reqPass = makeRequest('http://localhost/api/v1/stats', 'GET', 'NationalCommander');
      const resPass = await getStats(reqPass);
      expect(resPass.status).toBe(200);
    });

    it('blocks unauthorized and permits authorized roles on LIMS phlebotomy collection', async () => {
      const reqBlock = makeRequest('http://localhost/api/v1/lims/collect', 'POST', 'WarehouseIssuer', { donorId: 'D-12' });
      const resBlock = await postCollect(reqBlock);
      expect(resBlock.status).toBe(403);

      mockDb.donors.getAll.mockResolvedValue([{ id: 'D-12', deferralStatus: 'None' }]);
      const reqPass = makeRequest('http://localhost/api/v1/lims/collect', 'POST', 'DonorScreener', { donorId: 'D-12', volume: 450 });
      const resPass = await postCollect(reqPass);
      expect(resPass.status).toBe(200);
    });

    it('blocks unauthorized and permits authorized roles on LIMS component processing', async () => {
      const reqBlock = makeRequest('http://localhost/api/v1/lims/process-component/DON-1', 'POST', 'Courier');
      const resBlock = await postProcessComponent(reqBlock, { params: Promise.resolve({ id: 'DON-1' }) });
      expect(resBlock.status).toBe(403);

      const reqPass = makeRequest('http://localhost/api/v1/lims/process-component/DON-1', 'POST', 'LIMS_Simulator');
      const resPass = await postProcessComponent(reqPass, { params: Promise.resolve({ id: 'DON-1' }) });
      // Should bypass RBAC, and fail on IDM status check (returns 403 IDM_NOT_CLEARED)
      expect(resPass.status).toBe(403);
      const bodyPass = await resPass.json();
      expect(bodyPass.code).toBe('IDM_NOT_CLEARED');
    });

    it('blocks unauthorized and permits authorized roles on LIMS components release', async () => {
      const reqBlock = makeRequest('http://localhost/api/v1/lims/components/COMP-1/release', 'POST', 'Nurse');
      const resBlock = await postComponentRelease(reqBlock, { params: Promise.resolve({ id: 'COMP-1' }) });
      expect(resBlock.status).toBe(403);

      const reqPass = makeRequest('http://localhost/api/v1/lims/components/COMP-1/release', 'POST', 'LIMS_Simulator');
      const resPass = await postComponentRelease(reqPass, { params: Promise.resolve({ id: 'COMP-1' }) });
      // Should bypass RBAC, and fail on COMPONENT_NOT_FOUND (returns 404)
      expect(resPass.status).toBe(404);
    });
  });

  describe('Advisory Mode (VN_BECS_ENFORCE_API_RBAC=false)', () => {
    beforeEach(() => {
      process.env.VN_BECS_ENFORCE_API_RBAC = 'false';
    });

    it('completely bypasses RBAC checks on resources GET and POST', async () => {
      const reqGet = makeRequest('http://localhost/api/v1/resources', 'GET'); // no role
      const resGet = await getResources(reqGet);
      expect(resGet.status).toBe(200);

      const reqPost = makeRequest('http://localhost/api/v1/resources', 'POST', undefined, { name: 'Device B' }); // no role
      const resPost = await postResources(reqPost);
      expect(resPost.status).toBe(200);
    });

    it('completely bypasses RBAC checks on stats GET', async () => {
      const req = makeRequest('http://localhost/api/v1/stats', 'GET'); // no role
      const res = await getStats(req);
      expect(res.status).toBe(200);
    });
  });
});
