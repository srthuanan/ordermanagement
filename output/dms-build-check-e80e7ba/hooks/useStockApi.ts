import useSWR from 'swr';
import { useEffect, useCallback, useMemo } from 'react';
import { StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';
import { enrichTransitCarsWithRealLocations } from '../services/api/satelliteWarehouseService';

export const useStockApi = () => {
    const { data: result, error, mutate } = useSWR('stockData', () => apiService.getStockData(), {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
    });

    const { data: queuedVins, mutate: mutateQueued } = useSWR('myQueuedVins', () => apiService.getMyQueuedVins(), {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
    });

    useEffect(() => {
        const channel = supabase.channel('khoxe_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'khoxe' }, (payload) => {
                console.log('Real-time stock change:', payload);
                mutate(); 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_hold_activities' }, (payload) => {
                console.log('Real-time hold activity change:', payload);
                mutateQueued();
                mutate();
            })
            .subscribe();

        const handleSatelliteUpdate = () => {
            mutate();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('satellite_warehouses_updated', handleSatelliteUpdate);
        }

        return () => {
            supabase.removeChannel(channel);
            if (typeof window !== 'undefined') {
                window.removeEventListener('satellite_warehouses_updated', handleSatelliteUpdate);
            }
        };
    }, [mutate, mutateQueued]);

    const rawStock = result?.khoxe || [];
    const enrichedStock = useMemo(() => {
        return enrichTransitCarsWithRealLocations(rawStock);
    }, [rawStock]);

    return {
        stockData: enrichedStock,
        queuedVins: queuedVins || [],
        setStockData: (data: StockVehicle[]) => mutate({ ...result, status: 'SUCCESS', message: result?.message || '', khoxe: data }, false),
        isLoading: (!result && !error) || (!queuedVins),
        error: error instanceof Error ? error.message : (error ? String(error) : null),
        refetch: useCallback(async () => {
            await Promise.all([mutate(), mutateQueued()]);
        }, [mutate, mutateQueued])
    };
};
