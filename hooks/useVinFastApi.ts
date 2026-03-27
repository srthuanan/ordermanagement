import { useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Order } from '../types';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';

export const ARCHIVED_ORDERS_CACHE_KEY = 'archivedOrdersData';

export const useVinFastApi = (currentUser?: string, isCurrentUserAdmin?: boolean, usersToView?: string[]) => {

    // Key cho SWR thay đổi khi parameters thay đổi
    const key = ['getPaginatedData', currentUser, isCurrentUserAdmin, usersToView ? usersToView.join(',') : ''];

    const { data: result, error, mutate } = useSWR(key, async () => {
        // ... (rest of the fetching logic)
        // 1. Tải dữ liệu mới nhất (active) từ API
        const res = await apiService.getPaginatedData(usersToView, currentUser, isCurrentUserAdmin);
        let activeData: Order[] = res.data || [];
        const activeOrderNumbers = new Set(activeData.map(o => o['Số đơn hàng']));

        // 2. Khôi phục dữ liệu lưu trữ từ sessionStorage (để duy trì trong phiên đăng nhập)
        const cachedArchivesRaw = sessionStorage.getItem(ARCHIVED_ORDERS_CACHE_KEY);
        let archivedData: Order[] = [];
        let hasArchives = false;

        if (cachedArchivesRaw) {
            try {
                archivedData = JSON.parse(cachedArchivesRaw);
                // Loại bỏ những đơn hàng cũ trong cache đã được update lên 'activeData' từ API (để luôn có dữ liệu mới nhất)
                archivedData = archivedData.filter(o => !activeOrderNumbers.has(o['Số đơn hàng']));
                hasArchives = archivedData.length > 0;
            } catch (e) {
                console.error("Failed to parse cached archives:", e);
                sessionStorage.removeItem(ARCHIVED_ORDERS_CACHE_KEY);
            }
        }

        // 3. Kết hợp: Dữ liệu API (mới nhất) + Dữ liệu lưu trữ (phiên hiện tại)
        return { data: [...activeData, ...archivedData], hasArchives };
    }, {
        refreshInterval: 60000, // Tăng lên 1 phút vì đã có realtime, refresh này chỉ là backup
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        // Subscribe to changes on orders and requests
        const channel = supabase
            .channel('db-changes-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang' }, () => {
                console.log('Realtime change in donhang detected. Mutating...');
                mutate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'archived_orders' }, () => {
                console.log('Realtime change in archived_orders detected. Mutating...');
                mutate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'yeucauvc' }, () => {
                console.log('Realtime change in yeucauvc detected. Mutating...');
                mutate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'yeucauxhd' }, () => {
                console.log('Realtime change in yeucauxhd detected. Mutating...');
                mutate();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mutate]);


    return {
        historyData: result?.data || [],
        setHistoryData: (newData: Order[] | ((prev: Order[]) => Order[])) => {
            if (typeof newData === 'function') {
                const prevData = result?.data || [];
                mutate({ data: newData(prevData), hasArchives: result?.hasArchives || false }, false);
            } else {
                mutate({ data: newData, hasArchives: result?.hasArchives || false }, false);
            }
        },
        isLoading: !result && !error,
        error: error instanceof Error ? error.message : (error ? String(error) : null),
        refetch: useCallback(() => mutate(), [mutate]),
        archivesLoadedFromCache: result?.hasArchives || false
    };
};