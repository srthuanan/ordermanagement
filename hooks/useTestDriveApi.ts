import useSWR from 'swr';
import { useCallback } from 'react';
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
    const { data: result, error, mutate } = useSWR('testDriveSchedule', async () => {
        const res = await apiService.getTestDriveSchedule();
        if (res.status === 'SUCCESS' && res.data) {
            const schedule: TestDriveBooking[] = res.data;
            const sortedSchedule = schedule.sort((a, b) => {
                const dateA = moment(a.ngayThuXe, ["YYYY-MM-DD", "DD/MM/YYYY"]);
                const dateB = moment(b.ngayThuXe, ["YYYY-MM-DD", "DD/MM/YYYY"]);
                if (dateB.isAfter(dateA)) return 1;
                if (dateB.isBefore(dateA)) return -1;
                return timeToMinutes(b.thoiGianKhoiHanh) - timeToMinutes(a.thoiGianKhoiHanh);
            });
            return sortedSchedule;
        } else {
            throw new Error(res.message || 'Không thể tải dữ liệu lịch lái thử.');
        }
    });

    return {
        testDriveData: result || [],
        setTestDriveData: (newData: TestDriveBooking[]) => mutate(newData, false),
        isLoading: !result && !error,
        error: error instanceof Error ? error.message : (error ? String(error) : null),
        refetch: useCallback(() => mutate(), [mutate])
    };
};
