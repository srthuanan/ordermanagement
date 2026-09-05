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

export const updateVehicleConfig = async (id: string, value: string, parentValue: string | null = null) => {
    try {
        const { data, error } = await supabase.from('vehicle_configs').update({
            value, parent_value: parentValue, updated_at: new Date().toISOString()
        }).eq('id', id).select().single();
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

export const saveColorMappings = async (parentValue: string, exteriorColors: string[], interiorColors: string[]) => {
    try {
        // First delete all old mappings for this parent
        const { error: delError } = await supabase.from('vehicle_configs')
            .delete()
            .in('type', ['exterior', 'interior'])
            .eq('parent_value', parentValue);
            
        if (delError) throw delError;

        const inserts = [
            ...exteriorColors.map(c => ({ type: 'exterior', value: c, parent_value: parentValue })),
            ...interiorColors.map(c => ({ type: 'interior', value: c, parent_value: parentValue }))
        ];

        if (inserts.length > 0) {
            const { error: insError } = await supabase.from('vehicle_configs').insert(inserts);
            if (insError) throw insError;
        }

        return { status: 'SUCCESS' };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};
