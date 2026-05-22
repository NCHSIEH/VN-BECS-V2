import { supabase } from '../lib/supabaseClient';
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
const fallbackStores = {
  organizations: [] as any[],
  users: [] as any[],
  donors: [] as any[],
  questionnaires: [] as any[],
  donations: [] as any[],
  lab_tests: [] as any[],
  components: [] as any[],
  audit_events: [] as any[],
  orders: [] as any[],
  mtp_cases: [] as any[],
  product_catalog: [] as any[],
  inventory: [] as any[],
  transport_jobs: [] as any[],
  resources: [] as any[],
  patients: [
    { id: 'MRN-HCM-887766', mrn: 'MRN-HCM-887766', name: 'Nguyễn Văn A', bloodType: 'O Positive', abo: 'O', rhd: '+', hasAntibody: true, antibodyType: 'Anti-E', specimenExpired: true, specimenHours: 73, antibodyHistory: '[]' },
    { id: 'MRN-HN-112233', mrn: 'MRN-HN-112233', name: 'Trần Thị B', bloodType: 'A Negative', abo: 'A', rhd: '-', hasAntibody: false, specimenExpired: false, specimenHours: 12, antibodyHistory: '[]' },
    { id: 'MRN-DN-445566', mrn: 'MRN-DN-445566', name: 'Lê Văn C', bloodType: 'B Positive', abo: 'B', rhd: '+', hasAntibody: true, antibodyType: 'Anti-Kell', specimenExpired: false, specimenHours: 24, antibodyHistory: '[]' },
    { id: 'MRN-CT-998877', mrn: 'MRN-CT-998877', name: 'Phạm Thị D', bloodType: 'AB Positive', abo: 'AB', rhd: '+', hasAntibody: false, specimenExpired: true, specimenHours: 96, antibodyHistory: '[]' }
  ] as any[],
  transfusions: [] as any[],
  offline_events: [] as any[],
  reconciliation_reports: [] as any[],
  crossmatch: [] as any[],
  issue_records: [] as any[],
  adverse_reactions: [] as any[],
  rare_donors: [] as any[]
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
      password: data.password,
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
    if (data.password) payload.password = data.password;
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
  }
};

export const labTests = {
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
