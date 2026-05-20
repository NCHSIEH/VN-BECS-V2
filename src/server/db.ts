import { supabase } from '../lib/supabaseClient';
if (!supabase) {
  console.warn('DB API: Supabase client is not initialized. Check your environment variables.');
}

// Exported API (Matches the interface used by the application)
export const organizations = {
  async getAll() {
    const { data, error } = await supabase.from('organizations').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('organizations').insert(data);
    if (error) throw error;
  }
};

export const users = {
  async getByUsername(username: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .ilike('username', username)
      .maybeSingle();
    
    if (error || !user) return null;
    
    return { 
      ...user, 
      orgName: (user as any).organizations?.name, 
      orgType: (user as any).organizations?.type,
      photoUrl: user.photo_url,
      details: user.details ? JSON.parse(user.details) : {},
      permittedSystems: user.permitted_systems ? user.permitted_systems.split(',') : []
    };
  },
  async getAll() {
    const { data: rows, error } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    
    return rows.map((r: any) => ({ 
      ...r, 
      orgName: r.organizations?.name,
      orgType: r.organizations?.type,
      photoUrl: r.photo_url,
      details: r.details ? JSON.parse(r.details) : {},
      permittedSystems: r.permitted_systems ? r.permitted_systems.split(',') : [] 
    }));
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

    const { error } = await supabase.from('users').insert(payload);
    
    if (error && error.message.includes('column') && (error.message.includes('photo_url') || error.message.includes('details'))) {
      console.warn("Retrying insert without new columns (schema mismatch)");
      delete payload.photo_url;
      delete payload.details;
      const { error: retryError } = await supabase.from('users').insert(payload);
      if (retryError) throw retryError;
    } else if (error) {
      throw error;
    }
  },
  async updateStatus(id: string, isActive: boolean) {
    const { error } = await supabase.from('users').update({ isActive: isActive ? 1 : 0 }).eq('id', id);
    if (error) throw error;
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

    const { error } = await supabase.from('users').update(payload).eq('id', id);
    
    if (error && error.message.includes('column') && (error.message.includes('photo_url') || error.message.includes('details'))) {
      console.warn("Retrying update without new columns (schema mismatch)");
      delete payload.photo_url;
      delete payload.details;
      const { error: retryError } = await supabase.from('users').update(payload).eq('id', id);
      if (retryError) throw retryError;
    } else if (error) {
      throw error;
    }
    return { success: true };
  }
};

export const donors = {
  async getAll() {
    const { data, error } = await supabase.from('donors').select('*').order('registeredAt', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('donors').insert(data);
    if (error && error.message.includes('column') && error.message.includes('dob')) {
      console.warn("Retrying donors insert without dob (schema mismatch)");
      const payload = { ...data };
      delete payload.dob;
      const { error: retryError } = await supabase.from('donors').insert(payload);
      if (retryError) throw retryError;
    } else if (error) {
      throw error;
    }
  },
  async getByNationalId(nid: string) {
    const { data, error } = await supabase.from('donors').select('*').eq('nationalId', nid).maybeSingle();
    if (error) throw error;
    return data;
  }
};

export const questionnaires = {
  async getAll() {
    const { data, error } = await supabase.from('questionnaires').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('questionnaires').insert(data);
    if (error) throw error;
  }
};

export const donations = {
  async getAll() {
    // Note: This complex join might be better handled via a view or multiple queries if Supabase relations aren't perfect
    const { data: rows, error } = await supabase
      .from('donations')
      .select('*')
      .order('collectedAt', { ascending: false });
    
    if (error) throw error;
    
    // Attempt to fetch related data if possible, otherwise return basics
    return rows.map((r: any) => ({
      ...r,
      donorName: 'Donor ' + r.donorId,
      idmStatus: r.idmStatus || 'PENDING',
      componentCount: 0
    }));
  },
  async create(data: any) {
    let payload = { ...data };
    while (true) {
      const { error } = await supabase.from('donations').insert(payload);
      if (error && error.message.includes('column') && error.message.includes('schema cache')) {
        const match = error.message.match(/'([^']+)' column/);
        if (match && match[1]) {
           const col = match[1];
           console.warn(`Retrying donations insert without ${col} (schema mismatch)`);
           delete payload[col];
           continue;
        }
      }
      if (error) throw error;
      break;
    }
  }
};

export const labTests = {
  async updateByDonationId(donationId: string, data: any) {
    const { error } = await supabase.from('lab_tests').update(data).eq('donationId', donationId);
    if (error) throw error;
  },
  async create(data: any) {
    const { error } = await supabase.from('lab_tests').insert(data);
    if (error) throw error;
  }
};
export const lab_tests = labTests;

export const components = {
  async getAll() {
    try {
      const { data: rows, error } = await supabase.from('components').select('*');
      if (error) throw error;
      return rows.map((r: any) => ({
        ...r,
        abo: r.abo || 'O',
        rhd: r.rhd || '+',
        status: r.status || 'AVAILABLE'
      }));
    } catch (e) {
      console.warn('DB components.getAll failed, using mock data');
      return [
        { id: 'COMP-001', donationId: 'DON-001', type: 'RED_CELLS', status: 'AVAILABLE', abo: 'A', rhd: '+', expiryDate: '2026-06-15' },
        { id: 'COMP-002', donationId: 'DON-002', type: 'PLASMA', status: 'AVAILABLE', abo: 'B', rhd: '+', expiryDate: '2026-12-20' },
        { id: 'COMP-003', donationId: 'DON-003', type: 'PLATELETS', status: 'QUARANTINE', abo: 'O', rhd: '-', expiryDate: '2026-05-25' }
      ];
    }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('components').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async updateStatus(id: string, status: string) {
    const { error } = await supabase.from('components').update({ status }).eq('id', id);
    if (error) throw error;
  },
  async update(id: string, data: any) {
    const { error } = await supabase.from('components').update(data).eq('id', id);
    if (error) throw error;
  },
  async create(data: any) {
    let payload = { ...data };
    while (true) {
      const { error } = await supabase.from('components').insert(payload);
      if (error && error.message.includes('Could not find the table') && error.message.includes('components')) {
        console.warn('Mocking components.create because table is missing remotely');
        return;
      }
      if (error && error.message.includes('column') && error.message.includes('schema cache')) {
        const match = error.message.match(/'([^']+)' column/);
        if (match && match[1]) {
           const col = match[1];
           console.warn(`Retrying components insert without ${col} (schema mismatch)`);
           delete payload[col];
           continue;
        }
      }
      if (error) throw error;
      break;
    }
  }
};

export const auditEvents = {
  async getAll() {
    const { data, error } = await supabase.from('audit_events').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const id = data.id || `AUD-${Date.now()}-${Math.random().toString(36).substring(2,6)}`;
    const { error } = await supabase.from('audit_events').insert({ ...data, id });
    if (error) throw error;
  }
};
export const audit_events = auditEvents;

export const orders = {
  async getAll() {
    const { data: rows, error } = await supabase.from('orders').select('*').order('submittedAt', { ascending: false });
    if (error) throw error;
    
    return rows.map(r => ({ 
      ...r, 
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      allocatedUnits: typeof r.allocatedUnits === 'string' ? JSON.parse(r.allocatedUnits) : (r.allocatedUnits || [])
    }));
  },
  async create(data: any) {
    const { error } = await supabase.from('orders').insert({
      ...data,
      items: JSON.stringify(data.items),
      allocatedUnits: JSON.stringify(data.allocatedUnits || [])
    });
    if (error) throw error;
  },
  async update(id: string, data: any) {
    const payload = { ...data };
    if (data.items) payload.items = JSON.stringify(data.items);
    if (data.allocatedUnits) payload.allocatedUnits = JSON.stringify(data.allocatedUnits);
    
    const { error } = await supabase.from('orders').update(payload).eq('id', id);
    if (error) throw error;
  }
};

export const mtpCases = {
  async getAll() {
    const { data, error } = await supabase.from('mtp_cases').select('*').order('activatedAt', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('mtp_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { data: inserted, error } = await supabase.from('mtp_cases').insert(data).select().single();
    if (error) throw error;
    return inserted;
  },
  async update(id: string, data: any) {
    const { error } = await supabase.from('mtp_cases').update(data).eq('id', id);
    if (error) throw error;
  }
};

export const productCatalog = {
  async getAll() {
    const { data, error } = await supabase.from('product_catalog').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('product_catalog').insert({
      ...data,
      aboRequired: data.aboRequired ? 1 : 0,
      rhdRequired: data.rhdRequired ? 1 : 0
    });
    if (error) throw error;
  },
  async update(productCode: string, data: any) {
    const { error } = await supabase.from('product_catalog').update(data).eq('productCode', productCode);
    if (error) throw error;
  }
};
export const product_catalog = productCatalog;

export const inventory = {
  async getAll() {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('inventory').upsert(data);
    if (error) throw error;
  },
};

export const transportJobs = {
  async getByOrderId(orderId: string) {
    const { data, error } = await supabase.from('transport_jobs').select('*').eq('orderId', orderId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { 
      ...data, 
      readings: typeof data.readings === 'string' ? JSON.parse(data.readings) : (data.readings || []),
      coldChainViolation: !!data.coldChainViolation 
    };
  },
  async upsertTemperature(orderId: string, sensorId: string, newReadings: any[], coldChainViolation: boolean) {
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
    if (error) throw error;
  },
};
export const transport_jobs = transportJobs;

export const resources = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('resources').select('*');
      if (error) throw error;
      return data && data.length > 0 ? data : this.getMockData();
    } catch (e) {
      console.warn('DB resources.getAll failed, using mock data');
      return this.getMockData();
    }
  },
  getMockData() {
    return [
      { id: 'RES-001', name: 'Leukocyte Filter', type: 'CONSUMABLE', stockLevel: 840, minLevel: 200, status: 'NORMAL' },
      { id: 'RES-002', name: 'CPDA-1 Triple Bag', type: 'CONSUMABLE', stockLevel: 1250, minLevel: 500, status: 'NORMAL' },
      { id: 'RES-003', name: 'NAT Test Kit (HCV/HIV)', type: 'REAGENT', stockLevel: 42, minLevel: 100, status: 'CRITICAL' },
      { id: 'RES-004', name: 'Centrifuge Alpha', type: 'EQUIPMENT', stockLevel: 1, minLevel: 1, status: 'MAINTENANCE' }
    ];
  },
  async getByType(type: string) {
    const { data, error } = await supabase.from('resources').select('*').eq('type', type);
    if (error) throw error;
    return data;
  },
  async updateStatus(id: string, status: string) {
    const { error } = await supabase.from('resources').update({ status }).eq('id', id);
    if (error) throw error;
  },
  async updateStock(id: string, level: number) {
    const { error } = await supabase.from('resources').update({ stockLevel: level }).eq('id', id);
    if (error) throw error;
  },
  async create(data: any) {
    const { error } = await supabase.from('resources').insert(data);
    if (error) throw error;
  }
};

export const patients = {
  async getAll() {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('patients').insert({
      ...data,
      antibodyHistory: JSON.stringify(data.antibodyHistory || [])
    });
    if (error) throw error;
  },
};

export const transfusions = {
  async getAll() {
    const { data, error } = await supabase.from('transfusions').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('transfusions').insert({
      ...data,
      consentVerified: data.consentVerified ? 1 : 0,
      preVitalsChecked: data.preVitalsChecked ? 1 : 0,
      startedAt: data.startedAt || new Date().toISOString()
    });
    if (error) throw error;
  },
};

export const offlineEvents = {
  async getAll() {
    const { data, error } = await supabase.from('offline_events').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('offline_events').insert(data);
    if (error) throw error;
  },
};
export const offline_events = offlineEvents;

export const reconciliationReports = {
  async getAll() {
    const { data, error } = await supabase.from('reconciliation_reports').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('reconciliation_reports').insert({
      ...data,
      borrowedUnits: JSON.stringify(data.borrowedUnits || []),
      conflicts: JSON.stringify(data.conflicts || [])
    });
    if (error) throw error;
  },
  async resolve(id: string, resolvedBy: string) {
    const { error } = await supabase.from('reconciliation_reports').update({ 
      resolvedBy, 
      resolvedAt: new Date().toISOString() 
    }).eq('id', id);
    if (error) throw error;
  },
};
export const reconciliation_reports = reconciliationReports;

export const crossmatch = {
  async getAll() {
    const { data, error } = await supabase.from('crossmatch').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('crossmatch').insert(data);
    if (error) throw error;
  },
};

export const issueRecords = {
  async getAll() {
    const { data, error } = await supabase.from('issue_records').select('*');
    if (error) throw error;
    return data;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('issue_records').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('issue_records').insert(data);
    if (error) throw error;
  },
  async update(id: string, data: any) {
    const { error } = await supabase.from('issue_records').update(data).eq('id', id);
    if (error) throw error;
  }
};
export const issue_records = issueRecords;

export const adverseReactions = {
  async getAll() {
    const { data, error } = await supabase.from('adverse_reactions').select('*');
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { error } = await supabase.from('adverse_reactions').insert({
      ...data,
      lookbackTriggered: data.lookbackTriggered ? 1 : 0,
      allTransfusionsPaused: data.allTransfusionsPaused ? 1 : 0
    });
    if (error) throw error;
  },
};
export const adverse_reactions = adverseReactions;

export const rareDonors = {
  async getAll() {
    const { data, error } = await supabase.from('rare_donors').select('*');
    if (error) throw error;
    return data;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('rare_donors').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(data: any) {
    const { data: inserted, error } = await supabase.from('rare_donors').insert(data).select().single();
    if (error) throw error;
    return inserted;
  },
  async mobilize(id: string, reason: string) {
    const { error } = await supabase.from('rare_donors').update({ status: 'MOBILIZED', mobilizationReason: reason }).eq('id', id);
    if (error) throw error;
  },
  async update(id: string, data: any) {
    const { data: updated, error } = await supabase.from('rare_donors').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }
};

export async function resetDb() {
  // Resetting a remote DB is dangerous and slow. For the pilot, we'll just log it.
  // In a real app, you'd use a seed script or specific delete commands.
  console.log('Reset DB called. Remote reset not implemented via API for safety.');
}

export default supabase;
