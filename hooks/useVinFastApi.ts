import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import * as apiService from '../services/apiService';

export const useVinFastApi = (usersToView?: string[]) => {
    const [historyData, setHistoryData] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.getPaginatedData(usersToView);
            setHistoryData(result.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [usersToView]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { historyData, setHistoryData, isLoading, error, refetch: fetchData };
};
