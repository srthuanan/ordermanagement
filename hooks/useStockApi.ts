import useSWR from 'swr';
import { useEffect, useCallback, useMemo } from 'react';
import { StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';
import { enrichTransitCarsWithRealLocations } from '../services/api/satelliteWarehouseService';

export const useStockApi = () => {
    const { data: result, error, mutate } = useSWR('stockData', async () => {
        const response = await apiService.getStockData();
        if (response.status !== 'SUCCESS') {
            throw new Error(response.message || 'Không thể tải dữ liệu kho xe.');
        }
        return response;
    }, {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
    });

    const { data: queuedVins, mutate: mutateQueued } = useSWR('myQueuedVins', () => apiService.getMyQueuedVins(), {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
    });

    useEffect(() => {
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;
        let refreshQueue = false;
        const scheduleRefresh = (includeQueue = false) => {
            refreshQueue = refreshQueue || includeQueue;
            if (refreshTimer !== undefined) return;
            refreshTimer = setTimeout(() => {
                refreshTimer = undefined;
                const includeQueued = refreshQueue;
                refreshQueue = false;
                void mutate();
                if (includeQueued) void mutateQueued();
            }, 150);
        };
        const channel = supabase.channel('khoxe_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'khoxe' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_hold_activities' }, () => {
                scheduleRefresh(true);
            })
            .subscribe();

        const handleSatelliteUpdate = () => {
            scheduleRefresh();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('satellite_warehouses_updated', handleSatelliteUpdate);
        }

        return () => {
            if (refreshTimer !== undefined) clearTimeout(refreshTimer);
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
