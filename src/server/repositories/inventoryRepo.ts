import { supabase } from '../../lib/supabaseClient';
import { fallbackStores, isTableMissingError } from '../db';

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
      const payload = { ...data, version: data.version || 1 };
      const { error } = await supabase.from('inventory').upsert(payload);
      if (error) {
        if (isTableMissingError(error)) {
          const index = fallbackStores.inventory.findIndex(item => item.unitId === data.unitId);
          if (index >= 0) fallbackStores.inventory[index] = payload;
          else fallbackStores.inventory.push(payload);
          return;
        }
        throw error;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        const payload = { ...data, version: data.version || 1 };
        const index = fallbackStores.inventory.findIndex(item => item.unitId === data.unitId);
        if (index >= 0) fallbackStores.inventory[index] = payload;
        else fallbackStores.inventory.push(payload);
        return;
      }
      throw e;
    }
  },
  async updateStatusWithLock(unitId: string, currentVersion: number, updates: any) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update({ ...updates, version: currentVersion + 1 })
        .eq('unitId', unitId)
        .eq('version', currentVersion)
        .select()
        .maybeSingle();
      
      if (error) {
        if (isTableMissingError(error)) {
          return this.updateFallbackWithLock(unitId, currentVersion, updates);
        }
        throw error;
      }
      if (!data) throw new Error('ConcurrencyConflict: Unit has been modified by another process.');
      
      return data;
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return this.updateFallbackWithLock(unitId, currentVersion, updates);
      }
      throw e;
    }
  },
  updateFallbackWithLock(unitId: string, currentVersion: number, updates: any) {
    const item = fallbackStores.inventory.find(i => i.unitId === unitId);
    if (!item) throw new Error('Unit not found');
    const itemVersion = item.version || 1; // Default to 1 if missing
    if (itemVersion !== currentVersion) {
      throw new Error('ConcurrencyConflict: Unit has been modified by another process.');
    }
    
    Object.assign(item, updates, { version: itemVersion + 1 });
    return item;
  }
};
