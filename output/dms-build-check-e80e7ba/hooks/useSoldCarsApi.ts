import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import * as apiService from '../services/apiService';

export const useSoldCarsApi = (selectedMonth: number | null, selectedYear: number) => {
    const [soldData, setSoldData] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let result;
            if (selectedMonth !== null) {
                // Fetch specific month
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                result = await apiService.getSoldCarsDataByMonth(months[selectedMonth], selectedYear);
            } else {
                // Fetch all months for year
                result = await apiService.getAllSoldCarsData(selectedYear);
            }

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
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { soldData, isLoading, error, refetch: fetchData };
};
