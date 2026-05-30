import { supabase } from '../../lib/supabaseClient';
import { fallbackStores, isTableMissingError } from '../db';

export const patients = {
  async getAll() {
    try {
      const { data, error } = await supabase.from('patients').select('*, patient_antibodies(*)');
      if (error) {
        if (isTableMissingError(error)) {
          return this.getFallbackPatients();
        }
        throw error;
      }
      if (!data || data.length === 0) return this.getFallbackPatients();
      
      return data.map(p => ({
        ...p,
        antibodyHistory: (p.patient_antibodies || []).map((a: any) => a.antibody)
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return this.getFallbackPatients();
      }
      throw e;
    }
  },

  async getById(idOrMrn: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*, patient_antibodies(*)')
        .or(`id.eq.${idOrMrn},mrn.eq.${idOrMrn}`)
        .maybeSingle();
      if (error) {
        if (isTableMissingError(error)) {
          return this.getFallbackPatients().find(p => p.id === idOrMrn || p.mrn === idOrMrn) || null;
        }
        throw error;
      }
      if (!data) return null;
      return { ...data, antibodyHistory: (data.patient_antibodies || []).map((a: any) => a.antibody) };
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return this.getFallbackPatients().find(p => p.id === idOrMrn || p.mrn === idOrMrn) || null;
      }
      throw e;
    }
  },

  getFallbackPatients() {
    return fallbackStores.patients.map(p => {
      const antibodies = (fallbackStores as any).patient_antibodies?.filter((a: any) => a.patientId === p.id) || [];
      return {
        ...p,
        antibodyHistory: antibodies.map((a: any) => a.antibody)
      };
    });
  },

  async create(data: any) {
    const payload = { ...data };
    const antibodyHistory = payload.antibodyHistory || [];
    delete payload.antibodyHistory;

    try {
      const { data: insertedPatient, error: pError } = await supabase.from('patients').insert(payload).select().single();
      if (pError) {
        if (isTableMissingError(pError)) {
          this.createFallback(payload, antibodyHistory);
          return;
        }
        throw pError;
      }

      if (antibodyHistory.length > 0) {
        const records = antibodyHistory.map((a: string) => ({ patientId: insertedPatient.id, antibody: a }));
        const { error: aError } = await supabase.from('patient_antibodies').insert(records);
        if (aError) throw aError;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        this.createFallback(payload, antibodyHistory);
        return;
      }
      throw e;
    }
  },

  createFallback(payload: any, antibodyHistory: string[]) {
    fallbackStores.patients.unshift(payload);
    if (antibodyHistory.length > 0) {
      if (!(fallbackStores as any).patient_antibodies) {
        (fallbackStores as any).patient_antibodies = [];
      }
      const records = antibodyHistory.map((a: string) => ({ patientId: payload.id, antibody: a }));
      (fallbackStores as any).patient_antibodies.push(...records);
    }
  }
};
