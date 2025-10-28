import { useState, useEffect, useCallback } from 'react';
import { TestDriveBooking } from '../types';
import * as apiService from '../services/apiService';
import moment from 'moment';

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    if (time.includes('T') || time.includes(' ')) {
        const date = moment(time);
        if (date.isValid()) {
            return date.hour() * 60 + date.minute();
        }
    }
    const parts = time.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    return 0;
};

export const useTestDriveApi = () => {
    const [testDriveData, setTestDriveData] = useState<TestDriveBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.getTestDriveSchedule();
            if (result.status === 'SUCCESS' && result.data) {
                const schedule: TestDriveBooking[] = result.data;
                const sortedSchedule = schedule.sort((a, b) => {
                    const dateCompare = b.ngayThuXe.localeCompare(a.ngayThuXe);
                    if (dateCompare !== 0) return dateCompare;
                    return timeToMinutes(b.thoiGianKhoiHanh) - timeToMinutes(a.thoiGianKhoiHanh);
                });
                setTestDriveData(sortedSchedule);
            } else {
                throw new Error(result.message || 'Không thể tải dữ liệu lịch lái thử.');
            }
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

    return { testDriveData, setTestDriveData, isLoading, error, refetch: fetchData };
};
