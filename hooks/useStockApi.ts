import { useState, useEffect, useCallback } from 'react';
import { StockVehicle } from '../types';
import * as apiService from '../services/apiService';

export const useStockApi = () => {
    const [stockData, setStockData] = useState<StockVehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.getStockData();
            // The API is expected to return data in a 'khoxe' property based on the provided sample code.
            setStockData(result.khoxe || []);
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

    return { stockData, setStockData, isLoading, error, refetch: fetchData };
};
