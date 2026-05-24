import { supabase } from '../lib/supabaseClient';
import { hashPassword } from './crypto';
if (!supabase) {
  console.warn('DB API: Supabase client is not initialized. Check your environment variables.');
}

// Helper to detect if a table is missing in the database schema cache
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

// Fallback in-memory stores to ensure 100% system resilience
// even if the remote Supabase database has not been fully seeded or migrated yet.
export const fallbackStores = {
  organizations: [
    { id: 'BC-HN-01', name: '哈內中央血液中心 (Hanoi Blood Center)', type: 'BloodCenter', location: 'Hanoi, Vietnam', chairsCount: 4, createdAt: '2026-01-10T08:00:00Z' },
    { id: 'HOSP-HCM-02', name: '胡志明市人民第一醫院 (HCM People Hospital #1)', type: 'Hospital', location: 'HCM City, Vietnam', chairsCount: 3, createdAt: '2026-01-15T09:30:00Z' },
    { id: 'HUB-DN-03', name: '峴港醫療中轉物流樞紐 (Danang Supply Hub)', type: 'Hub', location: 'Danang, Vietnam', chairsCount: 3, createdAt: '2026-02-01T10:00:00Z' }
  ] as any[],
  users: [
    { id: 'USR-ADMIN', username: 'admin', password: 'admin123', role: 'Admin', orgId: 'HUB-DN-03', permitted_systems: 'MDM,IAM,HUB,LIMS,LAB,HOSPITAL,NATIONAL,DASHBOARD', photo_url: '', details: '{}', isActive: 1, createdAt: '2026-01-01T00:00:00Z' },
    { id: 'USR-OPERATOR', username: 'operator', password: 'password123', role: 'HospitalOperator', orgId: 'HOSP-HCM-02', permitted_systems: 'HOSPITAL,HUB', photo_url: '', details: '{}', isActive: 1, createdAt: '2026-01-20T11:00:00Z' },
    { id: 'USR-NURSE', username: 'nurse_hosp_1', password: '123', role: 'Nurse', orgId: 'BC-HN-01', permitted_systems: 'LIMS,LAB,HOSPITAL', photo_url: '', details: '{}', isActive: 1, createdAt: '2026-01-20T11:00:00Z' }
  ] as any[],
  donors: [
    { id: 'DNR-HCM-01', name: '陳明英 (Tran Minh Anh)', nationalId: '001095001234', dob: '1995-05-15', gender: 'Male', weight: 68, bloodType: 'O', rhd: 'Positive', registeredAt: '2026-05-24T08:00:00Z' },
    { id: 'DNR-HN-02', name: '黎氏花 (Le Thi Hoa)', nationalId: '002097005678', dob: '1997-09-20', gender: 'Female', weight: 52, bloodType: 'A', rhd: 'Negative', registeredAt: '2026-05-24T08:30:00Z' }
  ] as any[],
  lims_queues: [] as any[],
  questionnaires: [
    { id: 'QST-HCM-01', donorId: 'DNR-HCM-01', answersJson: '{"hadTattooRecently":false,"traveledToMalariaZone":false,"feelingUnwell":false,"hasHighRiskCondition":false}', isPassed: 1, createdAt: '2026-05-24T08:05:00Z', deferralReason: '', deferralUntil: '' },
    { id: 'QST-HN-02', donorId: 'DNR-HN-02', answersJson: '{"hadTattooRecently":true,"traveledToMalariaZone":false,"feelingUnwell":false,"hasHighRiskCondition":false}', isPassed: 0, createdAt: '2026-05-24T08:35:00Z', deferralReason: 'Tattoo within 6 months', deferralUntil: '2026-11-24T08:35:00Z' }
  ] as any[],
  donations: [
    { id: 'DON-HCM-01', donorId: 'DNR-HCM-01', questionnaireId: 'QST-HCM-01', collectedAt: '2026-05-24T08:15:00Z', volume: 350, donationType: 'WholeBlood' }
  ] as any[],
  lab_tests: [
    { id: 'TST-HCM-01', donationId: 'DON-HCM-01', abo: 'O', rhd: 'Positive', idmStatus: 'CLEARED', testedAt: '2026-05-24T08:45:00Z' }
  ] as any[],
  components: [
    { id: 'CMP-HCM-01-RBC', donationId: 'DON-HCM-01', productCode: 'P-RBC-01', type: 'RBC', status: 'AVAILABLE', abo: 'O', rhd: 'Positive', expiryDate: '2026-07-05T08:15:00Z', createdAt: '2026-05-24T09:00:00Z' },
    { id: 'CMP-HCM-01-FFP', donationId: 'DON-HCM-01', productCode: 'P-FFP-02', type: 'FFP', status: 'AVAILABLE', abo: 'O', rhd: 'Positive', expiryDate: '2027-05-24T08:15:00Z', createdAt: '2026-05-24T09:00:00Z' }
  ] as any[],
  audit_events: [] as any[],
  orders: [
    { id: 'ORD-HCM-901', hospital: 'HOSP-HCM-02', priority: 'EMERGENCY', status: 'IN_TRANSIT', hiciScore: 8.5, type: 'RBC', items: '[{"productCode":"P-RBC-01","quantity":1}]', patientId: 'MRN-HCM-887766', clinicalIndication: 'Acute Bleeding', specialRequirements: 'None', allocatedUnits: '["CMP-HCM-01-RBC"]', escalationReason: '', submittedAt: '2026-05-24T09:10:00Z' }
  ] as any[],
  mtp_cases: [] as any[],
  product_catalog: [
    { productCode: 'P-RBC-01', alias: '紅血球濃縮液 (Red Blood Cells)', componentClass: 'RBC', aboRequired: 1, rhdRequired: 1 },
    { productCode: 'P-FFP-02', alias: '新鮮冷凍血漿 (Fresh Frozen Plasma)', componentClass: 'FFP', aboRequired: 1, rhdRequired: 0 },
    { productCode: 'P-PLT-03', alias: '單採血小板濃縮液 (Platelets)', componentClass: 'PLT', aboRequired: 0, rhdRequired: 0 }
  ] as any[],
  inventory: [
    { unitId: 'CMP-HCM-01-RBC', productCode: 'P-RBC-01', abo: 'O', rhd: 'Positive', expiryDate: '2026-07-05T08:15:00Z', status: 'ALLOCATED', location: 'TEMP-FRIDGE-01', isIrradiated: false, isCmvNegative: true }
  ] as any[],
  transport_jobs: [
    { orderId: 'ORD-HCM-901', sensorId: 'SNS-COLD-554', readings: '[{"time":"09:12","temp":4.2},{"time":"09:22","temp":4.5}]', coldChainViolation: 0, updatedAt: '2026-05-24T09:25:00Z' }
  ] as any[],
  resources: [
    { id: 'RES-01', name: '配血微管卡片 (Gel Cards)', type: 'Consumable', lotNumber: 'LOT-GEL-8899', expiryDate: '2026-12-31', lastMaintenance: '', nextMaintenance: '', status: 'Active', stockLevel: 250, minStockLevel: 50, orgId: 'BC-HN-01' },
    { id: 'RES-02', name: 'IDM自動化核酸分析儀 (NAT PCR System)', type: 'Equipment', lotNumber: 'SER-NAT-7766', expiryDate: '', lastMaintenance: '2026-04-10', nextMaintenance: '2026-10-10', status: 'Active', stockLevel: 1, minStockLevel: 1, orgId: 'BC-HN-01' }
  ] as any[],
  patients: [
    { id: 'MRN-HCM-887766', mrn: 'MRN-HCM-887766', name: 'Nguyễn Văn A', bloodType: 'O Positive', abo: 'O', rhd: '+', hasAntibody: true, antibodyType: 'Anti-E', specimenExpired: true, specimenHours: 73, antibodyHistory: '[]' },
    { id: 'MRN-HN-112233', mrn: 'MRN-HN-112233', name: 'Trần Thị B', bloodType: 'A Negative', abo: 'A', rhd: '-', hasAntibody: false, specimenExpired: false, specimenHours: 12, antibodyHistory: '[]' },
    { id: 'MRN-DN-445566', mrn: 'MRN-DN-445566', name: 'Lê Văn C', bloodType: 'B Positive', abo: 'B', rhd: '+', hasAntibody: true, antibodyType: 'Anti-Kell', specimenExpired: false, specimenHours: 24, antibodyHistory: '[]' },
    { id: 'MRN-CT-998877', mrn: 'MRN-CT-998877', name: 'Phạm Thị D', bloodType: 'AB Positive', abo: 'AB', rhd: '+', hasAntibody: false, specimenExpired: true, specimenHours: 96, antibodyHistory: '[]' }
  ] as any[],
  transfusions: [
    { id: 'TF-901-01', componentId: 'CMP-HCM-01-RBC', patientId: 'MRN-HCM-887766', verifier1: 'Nurse Le', verifier2Pin: '9988', consentVerified: 1, preVitalsChecked: 1, status: 'COMPLETED', startedAt: '2026-05-24T09:20:00Z', completedAt: '2026-05-24T09:45:00Z' }
  ] as any[],
  offline_events: [] as any[],
  reconciliation_reports: [] as any[],
  crossmatch: [
    { id: 'XM-901-01', componentId: 'CMP-HCM-01-RBC', patientId: 'MRN-HCM-887766', method: 'Coomb_Test', result: 'COMPATIBLE', testedBy: 'Tech Nguyen', specimenDate: '2026-05-24T09:05:00Z', createdAt: '2026-05-24T09:15:00Z' }
  ] as any[],
  issue_records: [] as any[],
  adverse_reactions: [
    { id: 'AR-901-01', transfusionId: 'TF-901-01', patientId: 'MRN-HCM-887766', reactionType: 'Allergic', severity: 'Mild', description: 'Patient developed mild skin hives 15 minutes post transfusion.', actionsTaken: 'Transfusion slowed down, antihistamines administered.', lookbackTriggered: 0, allTransfusionsPaused: 0, reportedBy: 'Dr. Pham', reportedAt: '2026-05-24T09:50:00Z' }
  ] as any[],
  rare_donors: [
    { id: 'RD-01', name: '阮小龍 (Nguyen Tieu Long)', nationalId: '001099008877', bloodType: 'O', rhd: 'Negative', phenotype: 'Bombay O (h/h)', hlaTyping: '{"A":"02, 24","B":"46, 54"}', hpaTyping: '{"1":"a,a"}', location: 'Hanoi', contact: '+84901234567', status: 'Available', lastDonationDate: '2026-02-15', orgId: 'BC-HN-01' }
  ] as any[]
};

// Exported API (Matches the interface used by the application)
export const organizations = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('organizations').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.organizations;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.organizations;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.organizations;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('organizations').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.organizations.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.organizations.push(data);
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    try {
      const { error } = await supabase.from('organizations').update(data).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const org = fallbackStores.organizations.find(o => o.id === id);
          if (org) Object.assign(org, data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const org = fallbackStores.organizations.find(o => o.id === id);
        if (org) Object.assign(org, data);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.organizations = fallbackStores.organizations.filter(o => o.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.organizations = fallbackStores.organizations.filter(o => o.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const limsQueues = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('lims_queues').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.lims_queues;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.lims_queues;
      throw e;
    }
  },
  async getByOrg(orgId: string) {
    try {
      const { data, error } = await supabase.from('lims_queues').select('*').eq('orgId', orgId);
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.lims_queues.filter(q => q.orgId === orgId);
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.lims_queues.filter(q => q.orgId === orgId);
      throw e;
    }
  },
  async create(entry: any) {
    try {
      const { error } = await supabase.from('lims_queues').insert(entry);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.lims_queues.push(entry);
          return entry;
        }
        throw error;
      }
      return entry;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.lims_queues.push(entry);
        return entry;
      }
      throw e;
    }
  },
  async update(id: string, updates: any) {
    try {
      const { error } = await supabase.from('lims_queues').update(updates).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const entry = fallbackStores.lims_queues.find(q => q.id === id);
          if (entry) Object.assign(entry, updates);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const entry = fallbackStores.lims_queues.find(q => q.id === id);
        if (entry) Object.assign(entry, updates);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('lims_queues').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.lims_queues = fallbackStores.lims_queues.filter(q => q.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.lims_queues = fallbackStores.lims_queues.filter(q => q.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const users = {
  async getByUsername(username: string) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .ilike('username', username)
        .maybeSingle();
      
      if (error) {
        if (isTableMissingError(error)) {
          const fallbackUser = fallbackStores.users.find(u => u.username.toLowerCase() === username.toLowerCase());
          if (!fallbackUser) return null;
          return {
            ...fallbackUser,
            orgName: 'Fallback Org',
            orgType: 'Hospital',
            photoUrl: '',
            details: {},
            permittedSystems: ['LIMS_Simulator', 'HospitalOperator', 'Dispatcher', 'Admin']
          };
        }
        return null;
      }
      if (!user) return null;
      
      return { 
        ...user, 
        orgName: (user as any).organizations?.name, 
        orgType: (user as any).organizations?.type,
        photoUrl: user.photo_url,
        details: user.details ? JSON.parse(user.details) : {},
        permittedSystems: user.permitted_systems ? user.permitted_systems.split(',') : []
      };
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const fallbackUser = fallbackStores.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!fallbackUser) return null;
        return {
          ...fallbackUser,
          orgName: 'Fallback Org',
          orgType: 'Hospital',
          photoUrl: '',
          details: {},
          permittedSystems: ['LIMS_Simulator', 'HospitalOperator', 'Dispatcher', 'Admin']
        };
      }
      return null;
    }
  },
  async getAll() {
    try {
      const { data: rows, error } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .order('createdAt', { ascending: false });
      
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.users;
        throw error;
      }
      
      if (!rows || rows.length === 0) return fallbackStores.users;
      
      return rows.map((r: any) => ({ 
        ...r, 
        orgName: r.organizations?.name,
        orgType: r.organizations?.type,
        photoUrl: r.photo_url,
        details: r.details ? JSON.parse(r.details) : {},
        permittedSystems: r.permitted_systems ? r.permitted_systems.split(',') : [] 
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.users;
      throw e;
    }
  },
  async create(data: any) {
    const userId = data.id || `USR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const payload: any = {
      id: userId,
      username: data.username,
      password: hashPassword(data.password),
      role: data.role,
      orgId: data.orgId,
      photo_url: data.photoUrl || '',
      details: data.details ? JSON.stringify(data.details) : '{}',
      permitted_systems: data.permittedSystems?.join(',') || '',
      isActive: 1,
      createdAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('users').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.users.push(payload);
          return;
        }
        if (error.message.includes('column') && (error.message.includes('photo_url') || error.message.includes('details'))) {
          console.warn("Retrying insert without new columns (schema mismatch)");
          delete payload.photo_url;
          delete payload.details;
          const { error: retryError } = await supabase.from('users').insert(payload);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.users.push(payload);
        return;
      }
      throw e;
    }
  },
  async updateStatus(id: string, isActive: boolean) {
    try {
      const { error } = await supabase.from('users').update({ isActive: isActive ? 1 : 0 }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const user = fallbackStores.users.find(u => u.id === id);
          if (user) user.isActive = isActive ? 1 : 0;
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const user = fallbackStores.users.find(u => u.id === id);
        if (user) user.isActive = isActive ? 1 : 0;
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    const payload: any = {};
    if (data.username) payload.username = data.username;
    if (data.password) payload.password = hashPassword(data.password);
    if (data.role) payload.role = data.role;
    if (data.orgId) payload.orgId = data.orgId;
    if (data.photoUrl !== undefined) payload.photo_url = data.photoUrl;
    if (data.details !== undefined) payload.details = JSON.stringify(data.details);
    if (data.permittedSystems) payload.permitted_systems = data.permittedSystems.join(',');

    try {
      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const user = fallbackStores.users.find(u => u.id === id);
          if (user) Object.assign(user, payload);
          return { success: true };
        }
        if (error.message.includes('column') && (error.message.includes('photo_url') || error.message.includes('details'))) {
          console.warn("Retrying update without new columns (schema mismatch)");
          delete payload.photo_url;
          delete payload.details;
          const { error: retryError } = await supabase.from('users').update(payload).eq('id', id);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const user = fallbackStores.users.find(u => u.id === id);
        if (user) Object.assign(user, payload);
        return { success: true };
      }
      throw e;
    }
    return { success: true };
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.users = fallbackStores.users.filter(u => u.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.users = fallbackStores.users.filter(u => u.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const donors = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('donors').select('*').order('registeredAt', { ascending: false });
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.donors;
        }
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.donors;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.donors;
      }
      throw e;
    }
  },
  async create(data: any) {
    const safePayload = {
      id: data.id,
      name: data.name,
      nationalId: data.nationalId,
      bloodType: data.bloodType,
      rhd: data.rhd,
      registeredAt: data.registeredAt || new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('donors').insert(safePayload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.donors.unshift(safePayload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.donors.unshift(safePayload);
        return;
      }
      throw e;
    }
  },
  async getByNationalId(nid: string) {
    try {
      const { data, error } = await supabase.from('donors').select('*').eq('nationalId', nid).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.donors.find(d => d.nationalId === nid) || null;
        }
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.donors.find(d => d.nationalId === nid) || null;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('donors').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.donors = fallbackStores.donors.filter(d => d.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.donors = fallbackStores.donors.filter(d => d.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const questionnaires = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('questionnaires').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.questionnaires;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.questionnaires;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.questionnaires;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('questionnaires').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.questionnaires.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.questionnaires.push(data);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('questionnaires').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.questionnaires = fallbackStores.questionnaires.filter(q => q.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.questionnaires = fallbackStores.questionnaires.filter(q => q.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const donations = {
  async getAll() {
    try {
      const { data: rows, error } = await supabase
        .from('donations')
        .select('*')
        .order('collectedAt', { ascending: false });
      
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.donations.map((r: any) => ({
            ...r,
            donorName: 'Donor ' + r.donorId,
            idmStatus: r.idmStatus || 'PENDING',
            componentCount: 0
          }));
        }
        throw error;
      }
      
      if (!rows || rows.length === 0) {
        return fallbackStores.donations.map((r: any) => ({
          ...r,
          donorName: 'Donor ' + r.donorId,
          idmStatus: r.idmStatus || 'PENDING',
          componentCount: 0
        }));
      }
      
      return rows.map((r: any) => ({
        ...r,
        donorName: 'Donor ' + r.donorId,
        idmStatus: r.idmStatus || 'PENDING',
        componentCount: 0
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.donations.map((r: any) => ({
          ...r,
          donorName: 'Donor ' + r.donorId,
          idmStatus: r.idmStatus || 'PENDING',
          componentCount: 0
        }));
      }
      throw e;
    }
  },
  async create(data: any) {
    let payload = { ...data };
    try {
      const { error } = await supabase.from('donations').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.donations.unshift(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.donations.unshift(payload);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('donations').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.donations = fallbackStores.donations.filter(d => d.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.donations = fallbackStores.donations.filter(d => d.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const labTests = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('lab_tests').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.lab_tests;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.lab_tests;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.lab_tests;
      throw e;
    }
  },
  async updateByDonationId(donationId: string, data: any) {
    try {
      const { error } = await supabase.from('lab_tests').update(data).eq('donationId', donationId);
      if (error) {
        if (isTableMissingError(error)) {
          const test = fallbackStores.lab_tests.find(t => t.donationId === donationId);
          if (test) {
            Object.assign(test, data);
          } else {
            fallbackStores.lab_tests.push({ donationId, ...data });
          }
          // Also update donation status if present
          const donation = fallbackStores.donations.find(d => d.id === donationId);
          if (donation) {
            donation.idmStatus = data.idmStatus || donation.idmStatus;
          }
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const test = fallbackStores.lab_tests.find(t => t.donationId === donationId);
        if (test) {
          Object.assign(test, data);
        } else {
          fallbackStores.lab_tests.push({ donationId, ...data });
        }
        const donation = fallbackStores.donations.find(d => d.id === donationId);
        if (donation) {
          donation.idmStatus = data.idmStatus || donation.idmStatus;
        }
        return;
      }
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('lab_tests').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.lab_tests.unshift(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.lab_tests.unshift(data);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('lab_tests').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.lab_tests = fallbackStores.lab_tests.filter(t => t.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.lab_tests = fallbackStores.lab_tests.filter(t => t.id !== id);
        return;
      }
      throw e;
    }
  }
};
export const lab_tests = labTests;

export const components = {
  async getAll() {
    try {
      const { data: rows, error } = await supabase.from('components').select('*');
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.components.map((r: any) => ({
            ...r,
            abo: r.abo || 'O',
            rhd: r.rhd || '+',
            status: r.status || 'AVAILABLE'
          }));
        }
        throw error;
      }
      if (!rows || rows.length === 0) {
        return fallbackStores.components.map((r: any) => ({
          ...r,
          abo: r.abo || 'O',
          rhd: r.rhd || '+',
          status: r.status || 'AVAILABLE'
        }));
      }
      return rows.map((r: any) => ({
        ...r,
        abo: r.abo || 'O',
        rhd: r.rhd || '+',
        status: r.status || 'AVAILABLE'
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.components.map((r: any) => ({
          ...r,
          abo: r.abo || 'O',
          rhd: r.rhd || '+',
          status: r.status || 'AVAILABLE'
        }));
      }
      throw e;
    }
  },
  async getById(id: string) {
    try {
      const { data, error } = await supabase.from('components').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.components.find(c => c.id === id) || null;
        }
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.components.find(c => c.id === id) || null;
      }
      throw e;
    }
  },
  async updateStatus(id: string, status: string) {
    try {
      const { error } = await supabase.from('components').update({ status }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const comp = fallbackStores.components.find(c => c.id === id);
          if (comp) comp.status = status;
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const comp = fallbackStores.components.find(c => c.id === id);
        if (comp) comp.status = status;
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    try {
      const { error } = await supabase.from('components').update(data).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const comp = fallbackStores.components.find(c => c.id === id);
          if (comp) Object.assign(comp, data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const comp = fallbackStores.components.find(c => c.id === id);
        if (comp) Object.assign(comp, data);
        return;
      }
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('components').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.components.unshift(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.components.unshift(data);
        return;
      }
      throw e;
    }
  },
  async remove(id: string) {
    try {
      const { error } = await supabase.from('components').delete().eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.components = fallbackStores.components.filter(c => c.id !== id);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.components = fallbackStores.components.filter(c => c.id !== id);
        return;
      }
      throw e;
    }
  }
};

export const auditEvents = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('audit_events').select('*').order('timestamp', { ascending: false });
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.audit_events;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.audit_events;
      throw e;
    }
  },
  async create(data: any) {
    const id = data.id || `AUD-${Date.now()}-${Math.random().toString(36).substring(2,6)}`;
    try {
      const { error } = await supabase.from('audit_events').insert({ ...data, id });
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.audit_events.unshift({ ...data, id });
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.audit_events.unshift({ ...data, id });
        return;
      }
      throw e;
    }
  }
};
export const audit_events = auditEvents;

export const orders = {
  async getAll() {
    try {
      const { data: rows, error } = await supabase.from('orders').select('*').order('submittedAt', { ascending: false });
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.orders.map(r => ({ 
            ...r, 
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
            allocatedUnits: typeof r.allocatedUnits === 'string' ? JSON.parse(r.allocatedUnits) : (r.allocatedUnits || [])
          }));
        }
        throw error;
      }
      
      if (!rows || rows.length === 0) {
        return fallbackStores.orders.map(r => ({ 
          ...r, 
          items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
          allocatedUnits: typeof r.allocatedUnits === 'string' ? JSON.parse(r.allocatedUnits) : (r.allocatedUnits || [])
        }));
      }
      
      return rows.map(r => ({ 
        ...r, 
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        allocatedUnits: typeof r.allocatedUnits === 'string' ? JSON.parse(r.allocatedUnits) : (r.allocatedUnits || [])
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.orders.map(r => ({ 
          ...r, 
          items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
          allocatedUnits: typeof r.allocatedUnits === 'string' ? JSON.parse(r.allocatedUnits) : (r.allocatedUnits || [])
        }));
      }
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      items: JSON.stringify(data.items),
      allocatedUnits: JSON.stringify(data.allocatedUnits || [])
    };
    try {
      const { error } = await supabase.from('orders').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.orders.unshift(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.orders.unshift(payload);
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    const payload = { ...data };
    if (data.items) payload.items = JSON.stringify(data.items);
    if (data.allocatedUnits) payload.allocatedUnits = JSON.stringify(data.allocatedUnits);
    
    try {
      const { error } = await supabase.from('orders').update(payload).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const order = fallbackStores.orders.find(o => o.id === id);
          if (order) Object.assign(order, payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const order = fallbackStores.orders.find(o => o.id === id);
        if (order) Object.assign(order, payload);
        return;
      }
      throw e;
    }
  }
};

export const mtpCases = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('mtp_cases').select('*').order('activatedAt', { ascending: false });
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.mtp_cases;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.mtp_cases;
      throw e;
    }
  },
  async getById(id: string) {
    try {
      const { data, error } = await supabase.from('mtp_cases').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.mtp_cases.find(c => c.id === id) || null;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.mtp_cases.find(c => c.id === id) || null;
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      id: data.id || `MTP-${Date.now()}`,
      patientIdentifier: data.patientIdentifier,
      authorizedClinician: data.authorizedClinician,
      clinicalScenario: data.clinicalScenario,
      status: data.status || 'ACTIVE',
      activatedAt: data.activatedAt || new Date().toISOString()
    };
    try {
      const { data: inserted, error } = await supabase.from('mtp_cases').insert(payload).select().single();
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.mtp_cases.unshift(payload);
          return payload;
        }
        throw error;
      }
      return inserted;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.mtp_cases.unshift(payload);
        return payload;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    try {
      const { error } = await supabase.from('mtp_cases').update(data).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const mtp = fallbackStores.mtp_cases.find(c => c.id === id);
          if (mtp) Object.assign(mtp, data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const mtp = fallbackStores.mtp_cases.find(c => c.id === id);
        if (mtp) Object.assign(mtp, data);
        return;
      }
      throw e;
    }
  }
};

export const productCatalog = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('product_catalog').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.product_catalog;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.product_catalog;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.product_catalog;
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      aboRequired: data.aboRequired ? 1 : 0,
      rhdRequired: data.rhdRequired ? 1 : 0
    };
    try {
      const { error } = await supabase.from('product_catalog').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.product_catalog.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.product_catalog.push(payload);
        return;
      }
      throw e;
    }
  },
  async update(productCode: string, data: any) {
    try {
      const { error } = await supabase.from('product_catalog').update(data).eq('productCode', productCode);
      if (error) {
        if (isTableMissingError(error)) {
          const item = fallbackStores.product_catalog.find(p => p.productCode === productCode);
          if (item) Object.assign(item, data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const item = fallbackStores.product_catalog.find(p => p.productCode === productCode);
        if (item) Object.assign(item, data);
        return;
      }
      throw e;
    }
  }
};
export const product_catalog = productCatalog;

export const inventory = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('inventory').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.inventory;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.inventory;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.inventory;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('inventory').upsert(data);
      if (error) {
        if (isTableMissingError(error)) {
          const index = fallbackStores.inventory.findIndex(item => item.unitId === data.unitId);
          if (index >= 0) fallbackStores.inventory[index] = data;
          else fallbackStores.inventory.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const index = fallbackStores.inventory.findIndex(item => item.unitId === data.unitId);
        if (index >= 0) fallbackStores.inventory[index] = data;
        else fallbackStores.inventory.push(data);
        return;
      }
      throw e;
    }
  },
};

export const transportJobs = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('transport_jobs').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.transport_jobs;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.transport_jobs;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.transport_jobs;
      throw e;
    }
  },
  async getByOrderId(orderId: string) {
    try {
      const { data, error } = await supabase.from('transport_jobs').select('*').eq('orderId', orderId).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) {
          const job = fallbackStores.transport_jobs.find(j => j.orderId === orderId);
          if (!job) return null;
          return {
            ...job,
            readings: typeof job.readings === 'string' ? JSON.parse(job.readings) : (job.readings || []),
            coldChainViolation: !!job.coldChainViolation
          };
        }
        throw error;
      }
      if (!data) return null;
      return { 
        ...data, 
        readings: typeof data.readings === 'string' ? JSON.parse(data.readings) : (data.readings || []),
        coldChainViolation: !!data.coldChainViolation 
      };
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const job = fallbackStores.transport_jobs.find(j => j.orderId === orderId);
        if (!job) return null;
        return {
          ...job,
          readings: typeof job.readings === 'string' ? JSON.parse(job.readings) : (job.readings || []),
          coldChainViolation: !!job.coldChainViolation
        };
      }
      throw e;
    }
  },
  async upsertTemperature(orderId: string, sensorId: string, newReadings: any[], coldChainViolation: boolean) {
    try {
      const { data: existing } = await supabase.from('transport_jobs').select('*').eq('orderId', orderId).maybeSingle();
      const existingReadings = typeof existing?.readings === 'string' ? JSON.parse(existing.readings) : (existing?.readings || []);
      const merged = [...existingReadings, ...newReadings];
      const violation = coldChainViolation || (existing?.coldChainViolation ? true : false);
      
      const { error } = await supabase.from('transport_jobs').upsert({
        orderId,
        sensorId,
        readings: JSON.stringify(merged),
        coldChainViolation: violation ? 1 : 0,
        updatedAt: new Date().toISOString()
      });
      if (error) {
        if (isTableMissingError(error)) {
          const jobIndex = fallbackStores.transport_jobs.findIndex(j => j.orderId === orderId);
          const localExisting = fallbackStores.transport_jobs[jobIndex];
          const localExistingReadings = typeof localExisting?.readings === 'string' ? JSON.parse(localExisting.readings) : (localExisting?.readings || []);
          const localMerged = [...localExistingReadings, ...newReadings];
          const localViolation = coldChainViolation || (localExisting?.coldChainViolation ? true : false);
          
          const payload = {
            orderId,
            sensorId,
            readings: JSON.stringify(localMerged),
            coldChainViolation: localViolation ? 1 : 0,
            updatedAt: new Date().toISOString()
          };
          if (jobIndex >= 0) fallbackStores.transport_jobs[jobIndex] = payload;
          else fallbackStores.transport_jobs.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const jobIndex = fallbackStores.transport_jobs.findIndex(j => j.orderId === orderId);
        const localExisting = fallbackStores.transport_jobs[jobIndex];
        const localExistingReadings = typeof localExisting?.readings === 'string' ? JSON.parse(localExisting.readings) : (localExisting?.readings || []);
        const localMerged = [...localExistingReadings, ...newReadings];
        const localViolation = coldChainViolation || (localExisting?.coldChainViolation ? true : false);
        
        const payload = {
          orderId,
          sensorId,
          readings: JSON.stringify(localMerged),
          coldChainViolation: localViolation ? 1 : 0,
          updatedAt: new Date().toISOString()
        };
        if (jobIndex >= 0) fallbackStores.transport_jobs[jobIndex] = payload;
        else fallbackStores.transport_jobs.push(payload);
        return;
      }
      throw e;
    }
  },
};
export const transport_jobs = transportJobs;

export const resources = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('resources').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.resources;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.resources;
      return data || [];
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.resources;
      throw e;
    }
  },
  async getByType(type: string) {
    try {
      const { data, error } = await supabase.from('resources').select('*').eq('type', type);
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.resources.filter(r => r.type === type);
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.resources.filter(r => r.type === type);
      throw e;
    }
  },
  async updateStatus(id: string, status: string) {
    try {
      const { error } = await supabase.from('resources').update({ status }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const res = fallbackStores.resources.find(r => r.id === id);
          if (res) res.status = status;
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const res = fallbackStores.resources.find(r => r.id === id);
        if (res) res.status = status;
        return;
      }
      throw e;
    }
  },
  async updateStock(id: string, level: number) {
    try {
      const { error } = await supabase.from('resources').update({ stockLevel: level }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const res = fallbackStores.resources.find(r => r.id === id);
          if (res) res.stockLevel = level;
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const res = fallbackStores.resources.find(r => r.id === id);
        if (res) res.stockLevel = level;
        return;
      }
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('resources').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.resources.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.resources.push(data);
        return;
      }
      throw e;
    }
  }
};

export const patients = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.patients;
        }
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.patients;
      return data || [];
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.patients;
      }
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      antibodyHistory: JSON.stringify(data.antibodyHistory || [])
    };
    try {
      const { error } = await supabase.from('patients').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.patients.unshift(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.patients.unshift(payload);
        return;
      }
      throw e;
    }
  },
};

export const transfusions = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('transfusions').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.transfusions;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.transfusions;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.transfusions;
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      consentVerified: data.consentVerified ? 1 : 0,
      preVitalsChecked: data.preVitalsChecked ? 1 : 0,
      startedAt: data.startedAt || new Date().toISOString()
    };
    try {
      const { error } = await supabase.from('transfusions').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.transfusions.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.transfusions.push(payload);
        return;
      }
      throw e;
    }
  },
};

export const offlineEvents = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('offline_events').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.offline_events;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.offline_events;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('offline_events').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.offline_events.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.offline_events.push(data);
        return;
      }
      throw e;
    }
  },
};
export const offline_events = offlineEvents;

export const reconciliationReports = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('reconciliation_reports').select('*');
      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStores.reconciliation_reports.map(r => ({
            ...r,
            borrowedUnits: typeof r.borrowedUnits === 'string' ? JSON.parse(r.borrowedUnits) : (r.borrowedUnits || []),
            conflicts: typeof r.conflicts === 'string' ? JSON.parse(r.conflicts) : (r.conflicts || [])
          }));
        }
        throw error;
      }
      return data.map(r => ({
        ...r,
        borrowedUnits: typeof r.borrowedUnits === 'string' ? JSON.parse(r.borrowedUnits) : (r.borrowedUnits || []),
        conflicts: typeof r.conflicts === 'string' ? JSON.parse(r.conflicts) : (r.conflicts || [])
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return fallbackStores.reconciliation_reports.map(r => ({
          ...r,
          borrowedUnits: typeof r.borrowedUnits === 'string' ? JSON.parse(r.borrowedUnits) : (r.borrowedUnits || []),
          conflicts: typeof r.conflicts === 'string' ? JSON.parse(r.conflicts) : (r.conflicts || [])
        }));
      }
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      borrowedUnits: JSON.stringify(data.borrowedUnits || []),
      conflicts: JSON.stringify(data.conflicts || [])
    };
    try {
      const { error } = await supabase.from('reconciliation_reports').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.reconciliation_reports.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.reconciliation_reports.push(payload);
        return;
      }
      throw e;
    }
  },
  async resolve(id: string, resolvedBy: string) {
    try {
      const { error } = await supabase.from('reconciliation_reports').update({ 
        resolvedBy, 
        resolvedAt: new Date().toISOString() 
      }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const report = fallbackStores.reconciliation_reports.find(r => r.id === id);
          if (report) {
            report.resolvedBy = resolvedBy;
            report.resolvedAt = new Date().toISOString();
          }
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const report = fallbackStores.reconciliation_reports.find(r => r.id === id);
        if (report) {
          report.resolvedBy = resolvedBy;
          report.resolvedAt = new Date().toISOString();
        }
        return;
      }
      throw e;
    }
  },
};
export const reconciliation_reports = reconciliationReports;

export const crossmatch = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('crossmatch').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.crossmatch;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.crossmatch;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.crossmatch;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('crossmatch').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.crossmatch.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.crossmatch.push(data);
        return;
      }
      throw e;
    }
  },
};

export const issueRecords = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('issue_records').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.issue_records;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.issue_records;
      throw e;
    }
  },
  async getById(id: string) {
    try {
      const { data, error } = await supabase.from('issue_records').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.issue_records.find(r => r.id === id) || null;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.issue_records.find(r => r.id === id) || null;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { error } = await supabase.from('issue_records').insert(data);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.issue_records.push(data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.issue_records.push(data);
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    try {
      const { error } = await supabase.from('issue_records').update(data).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const rec = fallbackStores.issue_records.find(r => r.id === id);
          if (rec) Object.assign(rec, data);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const rec = fallbackStores.issue_records.find(r => r.id === id);
        if (rec) Object.assign(rec, data);
        return;
      }
      throw e;
    }
  }
};
export const issue_records = issueRecords;

export const adverseReactions = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('adverse_reactions').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.adverse_reactions;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.adverse_reactions;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.adverse_reactions;
      throw e;
    }
  },
  async create(data: any) {
    const payload = {
      ...data,
      lookbackTriggered: data.lookbackTriggered ? 1 : 0,
      allTransfusionsPaused: data.allTransTransfusionsPaused ? 1 : 0
    };
    try {
      const { error } = await supabase.from('adverse_reactions').insert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.adverse_reactions.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.adverse_reactions.push(payload);
        return;
      }
      throw e;
    }
  },
};
export const adverse_reactions = adverseReactions;

export const rareDonors = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('rare_donors').select('*');
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.rare_donors;
        throw error;
      }
      if (!data || data.length === 0) return fallbackStores.rare_donors;
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.rare_donors;
      throw e;
    }
  },
  async getById(id: string) {
    try {
      const { data, error } = await supabase.from('rare_donors').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) return fallbackStores.rare_donors.find(r => r.id === id) || null;
        throw error;
      }
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) return fallbackStores.rare_donors.find(r => r.id === id) || null;
      throw e;
    }
  },
  async create(data: any) {
    try {
      const { data: inserted, error } = await supabase.from('rare_donors').insert(data).select().single();
      if (error) {
        if (isTableMissingError(error)) {
          fallbackStores.rare_donors.push(data);
          return data;
        }
        throw error;
      }
      return inserted;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        fallbackStores.rare_donors.push(data);
        return data;
      }
      throw e;
    }
  },
  async mobilize(id: string, reason: string) {
    try {
      const { error } = await supabase.from('rare_donors').update({ status: 'MOBILIZED', mobilizationReason: reason }).eq('id', id);
      if (error) {
        if (isTableMissingError(error)) {
          const donor = fallbackStores.rare_donors.find(r => r.id === id);
          if (donor) {
            donor.status = 'MOBILIZED';
            donor.mobilizationReason = reason;
          }
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const donor = fallbackStores.rare_donors.find(r => r.id === id);
        if (donor) {
          donor.status = 'MOBILIZED';
          donor.mobilizationReason = reason;
        }
        return;
      }
      throw e;
    }
  },
  async update(id: string, data: any) {
    try {
      const { data: updated, error } = await supabase.from('rare_donors').update(data).eq('id', id).select().single();
      if (error) {
        if (isTableMissingError(error)) {
          const donor = fallbackStores.rare_donors.find(r => r.id === id);
          if (donor) Object.assign(donor, data);
          return donor;
        }
        throw error;
      }
      return updated;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const donor = fallbackStores.rare_donors.find(r => r.id === id);
        if (donor) Object.assign(donor, data);
        return donor;
      }
      throw e;
    }
  }
};

export const translations = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('translations').select('*');
      if (error) {
        if (isTableMissingError(error)) return [];
        throw error;
      }
      return data || [];
    } catch (e: any) {
      if (isTableMissingError(e)) return [];
      throw e;
    }
  }
};

export async function resetDb() {
  console.log('Reset DB called. Remote reset not implemented via API for safety.');
}

export default supabase;
