import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import * as apiService from '../services/apiService';

const ARCHIVED_ORDERS_CACHE_KEY = 'archivedOrdersData';

export const useVinFastApi = () => {
    const [historyData, setHistoryData] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [archivesLoadedFromCache, setArchivesLoadedFromCache] = useState(false);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.getPaginatedData();
            let initialData = result.data || [];

            // Check for cached archives
            const cachedArchives = sessionStorage.getItem(ARCHIVED_ORDERS_CACHE_KEY);
            if (cachedArchives) {
                try {
                    const parsedArchives: Order[] = JSON.parse(cachedArchives);
                    // Combine non-archived with cached archived data
                    initialData = [...initialData, ...parsedArchives];
                    setArchivesLoadedFromCache(true);
                } catch (e) {
                    console.error("Failed to parse cached archives:", e);
                    // Clear corrupted data
                    sessionStorage.removeItem(ARCHIVED_ORDERS_CACHE_KEY);
                    setArchivesLoadedFromCache(false);
                }
            } else {
                setArchivesLoadedFromCache(false);
            }

            setHistoryData(initialData);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { historyData, setHistoryData, isLoading, error, refetch: fetchData, archivesLoadedFromCache };
};