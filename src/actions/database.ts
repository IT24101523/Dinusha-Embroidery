'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export async function clearAllDatabaseData() {
  try {
    // Delete in reverse order of foreign key dependencies
    await supabaseAdmin.from('production_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('styles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('machines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to clear database data:', error);
    return { success: false, error: error.message };
  }
}

export async function getDatabaseCounts() {
  try {
    const { count: machineCount } = await supabaseAdmin.from('machines').select('*', { count: 'exact', head: true });
    const { count: clientCount } = await supabaseAdmin.from('clients').select('*', { count: 'exact', head: true });
    const { count: styleCount } = await supabaseAdmin.from('styles').select('*', { count: 'exact', head: true });
    const { count: assignmentCount } = await supabaseAdmin.from('production_assignments').select('*', { count: 'exact', head: true });

    return {
      machines: machineCount || 0,
      clients: clientCount || 0,
      styles: styleCount || 0,
      assignments: assignmentCount || 0,
    };
  } catch (error: any) {
    console.error('Error fetching database counts:', error);
    return { machines: 0, clients: 0, styles: 0, assignments: 0 };
  }
}
