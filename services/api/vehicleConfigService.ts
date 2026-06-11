import { supabase } from '../supabaseClient';

export const getVehicleConfigs = async () => {
    try {
        const { data, error } = await supabase.from('vehicle_configs').select('*');
        if (error) throw error;
        return { status: 'SUCCESS', data };
    } catch (err: any) {
        console.error("Error fetching vehicle configs:", err);
        return { status: 'ERROR', message: err.message };
    }
};

export const addVehicleConfig = async (type: string, value: string, parentValue: string | null = null) => {
    try {
        const { data, error } = await supabase.from('vehicle_configs').insert({
            type, value, parent_value: parentValue
        }).select().single();
        if (error) throw error;
        return { status: 'SUCCESS', data };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const deleteVehicleConfig = async (id: string) => {
    try {
        const { error } = await supabase.from('vehicle_configs').delete().eq('id', id);
        if (error) throw error;
        return { status: 'SUCCESS' };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};
