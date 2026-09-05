import React, { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const PricingCalculatorIframeView: React.FC = () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const targetUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}tinh-gia-xe.html`;

    useEffect(() => {
        const fetchLatestPricingConfig = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'vfe_pricing_config_override')
                    .maybeSingle();

                if (data && data.value) {
                    const parsedStr = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
                    localStorage.setItem('vfe_pricing_config_override', parsedStr);
                    window.dispatchEvent(new Event('vfe_pricing_config_updated'));
                }
            } catch (e) {
                console.error("Error fetching pricing config from Supabase:", e);
            }
        };

        fetchLatestPricingConfig();
    }, []);

    return (
        <div className="w-full h-full bg-white rounded-2xl shadow-sm border border-border-primary overflow-hidden animate-fade-in relative">
            <iframe
                src={targetUrl}
                title="Báo Giá Xe & Tính Trả Góp VinFast"
                className="w-full h-full border-0"
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};

export default PricingCalculatorIframeView;
