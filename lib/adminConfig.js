import { supabase } from './supabase';

export async function getAdminConfig(adminPhone, adminPassword) {
  try {
    const { data, error } = await supabase.functions.invoke('admin-esms-config', {
      body: { action: 'get', admin_phone: adminPhone, admin_password: adminPassword },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { configs: data.configs };
  } catch (e) {
    return { error: e.message };
  }
}

export async function setAdminConfig(adminPhone, adminPassword, config) {
  try {
    const { data, error } = await supabase.functions.invoke('admin-esms-config', {
      body: { action: 'set', admin_phone: adminPhone, admin_password: adminPassword, config },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}
