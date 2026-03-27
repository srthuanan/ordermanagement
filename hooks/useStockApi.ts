import useSWR from 'swr';
import { useEffect, useCallback } from 'react';
import { StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';

export const useStockApi = () => {
    const { data: result, error, mutate } = useSWR('stockData', () => apiService.getStockData(), {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    const { data: queuedVins, mutate: mutateQueued } = useSWR('myQueuedVins', () => apiService.getMyQueuedVins(), {
        revalidateOnFocus: true,
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mutate, mutateQueued]);

    return {
        stockData: result?.khoxe || [],
        queuedVins: queuedVins || [],
        setStockData: (data: StockVehicle[]) => mutate({ ...result, status: 'SUCCESS', message: result?.message || '', khoxe: data }, false),
        isLoading: (!result && !error) || (!queuedVins),
        error: error instanceof Error ? error.message : (error ? String(error) : null),
        refetch: useCallback(() => {
            mutate();
            mutateQueued();
        }, [mutate, mutateQueued])
    };
};
