import { supabase } from '../../lib/supabaseClient';
import { fallbackStores, isTableMissingError } from '../db';

export const orders = {
  async getAll() {
    try {
      const { data: rows, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('submittedAt', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return this.getFallbackOrders();
        }
        throw error;
      }
      
      if (!rows || rows.length === 0) {
        return this.getFallbackOrders();
      }
      
      return rows.map(r => ({
        ...r,
        items: r.order_items || [],
        allocatedUnits: (r.order_items || []).flatMap((i: any) => i.allocatedUnits ? i.allocatedUnits.split(',') : [])
      }));
    } catch (e: any) {
      if (isTableMissingError(e)) {
        return this.getFallbackOrders();
      }
      throw e;
    }
  },

  getFallbackOrders() {
    return fallbackStores.orders.map(o => {
      const items = (fallbackStores as any).order_items?.filter((i: any) => i.orderId === o.id) || [];
      return {
        ...o,
        items,
        allocatedUnits: items.flatMap((i: any) => i.allocatedUnits ? i.allocatedUnits.split(',') : [])
      };
    });
  },

  async create(data: any) {
    const payload = { ...data };
    const items = payload.items || [];
    delete payload.items;
    delete payload.allocatedUnits;

    try {
      const { data: insertedOrder, error: orderError } = await supabase.from('orders').insert(payload).select().single();
      
      if (orderError) {
        if (isTableMissingError(orderError)) {
          this.createFallback(payload, items);
          return;
        }
        throw orderError;
      }

      if (items.length > 0) {
        const orderItems = items.map((i: any) => ({ ...i, orderId: insertedOrder.id }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        this.createFallback(payload, items);
        return;
      }
      throw e;
    }
  },

  createFallback(payload: any, items: any[]) {
    fallbackStores.orders.unshift(payload);
    if (items.length > 0) {
      const orderItems = items.map((i: any) => ({ ...i, orderId: payload.id }));
      if (!(fallbackStores as any).order_items) {
        (fallbackStores as any).order_items = [];
      }
      (fallbackStores as any).order_items.push(...orderItems);
    }
  },

  async updateWithLock(id: string, currentVersion: number, data: any) {
    const payload = { ...data };
    const items = payload.items;
    delete payload.items;
    delete payload.allocatedUnits;
    
    try {
      if (Object.keys(payload).length > 0) {
        payload.version = currentVersion + 1;
        const { data: updated, error } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', id)
          .eq('version', currentVersion)
          .select()
          .maybeSingle();
          
        if (error) {
          if (isTableMissingError(error)) {
            this.updateFallbackWithLock(id, currentVersion, payload, items);
            return;
          }
          throw error;
        }
        if (!updated) throw new Error('ConcurrencyConflict: Order has been modified by another process.');
      }

      if (items) {
        await supabase.from('order_items').delete().eq('orderId', id);
        if (items.length > 0) {
          const orderItems = items.map((i: any) => ({ ...i, orderId: id }));
          await supabase.from('order_items').insert(orderItems);
        }
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        this.updateFallbackWithLock(id, currentVersion, payload, items);
        return;
      }
      throw e;
    }
  },

  updateFallbackWithLock(id: string, currentVersion: number, payload: any, items: any[]) {
    const order = fallbackStores.orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    const orderVersion = order.version || 1;
    if (orderVersion !== currentVersion) {
      throw new Error('ConcurrencyConflict: Order has been modified by another process.');
    }
    
    Object.assign(order, payload, { version: orderVersion + 1 });
    
    if (items) {
      if (!(fallbackStores as any).order_items) (fallbackStores as any).order_items = [];
      (fallbackStores as any).order_items = (fallbackStores as any).order_items.filter((i: any) => i.orderId !== id);
      const orderItems = items.map((i: any) => ({ ...i, orderId: id }));
      (fallbackStores as any).order_items.push(...orderItems);
    }
  },

  async update(id: string, data: any) {
    // Normal update remains for non-locked updates
    const payload = { ...data };
    const items = payload.items;
    delete payload.items;
    delete payload.allocatedUnits;
    
    try {
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from('orders').update(payload).eq('id', id);
        if (error) {
          if (isTableMissingError(error)) {
            this.updateFallback(id, payload, items);
            return;
          }
          throw error;
        }
      }

      if (items) {
        await supabase.from('order_items').delete().eq('orderId', id);
        if (items.length > 0) {
          const orderItems = items.map((i: any) => ({ ...i, orderId: id }));
          await supabase.from('order_items').insert(orderItems);
        }
      }
    } catch (e: any) {
      if (isTableMissingError(e)) {
        this.updateFallback(id, payload, items);
        return;
      }
      throw e;
    }
  },

  updateFallback(id: string, payload: any, items: any[]) {
    const order = fallbackStores.orders.find(o => o.id === id);
    if (order) Object.assign(order, payload);
    
    if (items) {
      if (!(fallbackStores as any).order_items) (fallbackStores as any).order_items = [];
      (fallbackStores as any).order_items = (fallbackStores as any).order_items.filter((i: any) => i.orderId !== id);
      const orderItems = items.map((i: any) => ({ ...i, orderId: id }));
      (fallbackStores as any).order_items.push(...orderItems);
    }
  }
};
