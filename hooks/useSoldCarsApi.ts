import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import * as apiService from '../services/apiService';

export const useSoldCarsApi = () => {
    const [soldData, setSoldData] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Using the new service function
            const result = await apiService.getAllSoldCarsData();
            if (result.status === 'SUCCESS') {
                setSoldData(result.data || []);
            } else {
                throw new Error(result.message || 'Failed to fetch sold cars data.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { soldData, isLoading, error, refetch: fetchData };
};
