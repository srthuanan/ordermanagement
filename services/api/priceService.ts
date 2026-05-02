import { supabase } from '../supabaseClient';

export interface CarPrice {
    model: string;
    version: string;
    type: string;
    msrp_price: number;
}

export interface PolicyRule {
    id: string;
    name: string;
    category: string;
    rule_type: 'DISCOUNT' | 'SURCHARGE';
    deduct_from_invoice: boolean;
    value: number;
    is_percentage: boolean;
    apply_to_models: string[] | null;
    description: string | null;
}

export interface ColorPrice {
    model: string;
    color_name: string;
    additional_price: number;
}

export const getCarPrices = async (): Promise<CarPrice[]> => {
    const { data, error } = await supabase
        .from('car_prices_master')
        .select('*')
        .order('model', { ascending: true });
    
    if (error) {
        console.error('Error fetching car prices:', error);
        return [];
    }
    return data || [];
};

export const getPolicyRules = async (): Promise<PolicyRule[]> => {
    const { data, error } = await supabase
        .from('policy_deduction_rules')
        .select('*')
        .order('category', { ascending: true });
    
    if (error) {
        console.error('Error fetching policy rules:', error);
        return [];
    }
    return data || [];
};

export const getCarColorPrices = async (): Promise<ColorPrice[]> => {
    const { data, error } = await supabase
        .from('car_color_prices')
        .select('*');
    
    if (error) {
        console.error('Error fetching color prices:', error);
        return [];
    }
    return data || [];
};
