import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { Order, StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { useVinFastApi } from './useVinFastApi';
import { useStockApi } from './useStockApi';
import { useSoldCarsApi } from './useSoldCarsApi';
import { useTestDriveApi } from './useTestDriveApi';
import { normalizeName } from '../services/authService';

interface UseAppDataProps {
    currentUser: string;
    currentUserName: string;
    userRole: string;
    isCurrentUserAdmin: boolean;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const useAppData = ({ currentUser, userRole, isCurrentUserAdmin, showToast }: UseAppDataProps) => {
    // --- EXISTING HOOKS ---
    const { historyData: allHistoryData, setHistoryData: setAllHistoryData, isLoading: isLoadingHistory, error: errorHistory, refetch: refetchHistory, archivesLoadedFromCache } = useVinFastApi();
    const { stockData, setStockData, isLoading: isLoadingStock, error: errorStock, refetch: refetchStock } = useStockApi();
    const { soldData, isLoading: isLoadingSold, error: errorSold, refetch: refetchSold } = useSoldCarsApi();
    const { testDriveData, setTestDriveData, isLoading: isLoadingTestDrive, refetch: refetchTestDrive } = useTestDriveApi();

    // --- NEW LOCAL STATES ---
    const [xuathoadonData, setXuathoadonData] = useState<Order[]>([]);
    const [isLoadingXuathoadon, setIsLoadingXuathoadon] = useState(true);
    const [errorXuathoadon, setErrorXuathoadon] = useState<string | null>(null);

    const [teamData, setTeamData] = useState<Record<string, string[]>>({});
    const [allUsers, setAllUsers] = useState<{ name: string, role: string, username: string }[]>([]);

    const [highlightedVins, setHighlightedVins] = useState<Set<string>>(new Set());
    const prevStockDataRef = useRef<StockVehicle[]>([]);

    // --- FETCHING LOGIC ---
    const refetchXuathoadon = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoadingXuathoadon(true);
        setErrorXuathoadon(null);
        try {
            const result = await apiService.getXuathoadonData();
            setXuathoadonData(result.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setErrorXuathoadon(message);
        } finally {
            if (!isSilent) setIsLoadingXuathoadon(false);
        }
    }, []);

    const fetchAdminData = useCallback(async (isSilent = false) => {
        if (!isCurrentUserAdmin && userRole !== 'Trưởng Phòng Kinh Doanh') return;
        try {
            const [teamsResult, usersResult] = await Promise.all([
                apiService.getTeamData(),
                apiService.getUsers()
            ]);

            if (teamsResult.status === 'SUCCESS' && teamsResult.teamData) {
                setTeamData(teamsResult.teamData);
            } else {
                console.error('Failed to fetch team data:', teamsResult.message);
            }

            if (usersResult.status === 'SUCCESS' && usersResult.users) {
                setAllUsers(usersResult.users);
            } else {
                console.error('Failed to fetch user list:', usersResult.message);
            }
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            if (!isSilent) showToast('Lỗi Tải Dữ Liệu', 'Không thể tải dữ liệu quản trị phòng ban.', 'error');
        }
    }, [isCurrentUserAdmin, userRole, showToast]);

    useEffect(() => {
        fetchAdminData();
        refetchXuathoadon();
    }, [fetchAdminData, refetchXuathoadon]);

    // --- PERMISSION / FILTERING LOGIC ---
    const usersToView = useMemo(() => {
        if (userRole !== 'Trưởng Phòng Kinh Doanh') {
            return undefined;
        }

        const normalizedCurrentUser = normalizeName(currentUser);
        const teamMapKey = Object.keys(teamData).find(key => normalizeName(key) === normalizedCurrentUser);

        if (teamMapKey && teamData[teamMapKey]) {
            const teamMembers = teamData[teamMapKey];
            return [teamMapKey, ...teamMembers].map(name => normalizeName(name));
        }

        return [normalizedCurrentUser];
    }, [currentUser, userRole, teamData]);

    const historyData = useMemo(() => {
        if (isCurrentUserAdmin) {
            return allHistoryData;
        }
        if (userRole === 'Trưởng Phòng Kinh Doanh' && usersToView) {
            const teamNames = new Set(usersToView.map(name => normalizeName(name)));
            return allHistoryData.filter(order => teamNames.has(normalizeName(order['Tên tư vấn bán hàng'])));
        }
        // Regular user
        const normalizedCurrentUser = normalizeName(currentUser);
        return allHistoryData.filter(order => normalizeName(order['Tên tư vấn bán hàng']) === normalizedCurrentUser);
    }, [allHistoryData, isCurrentUserAdmin, userRole, usersToView, currentUser]);

    // --- STOCK POLLING LOGIC ---
    useEffect(() => {
        prevStockDataRef.current = stockData;
    }, [stockData]);

    const handleRealtimeStockUpdate = useCallback(async () => {
        if (document.hidden) return;

        try {
            const result = await apiService.getStockData();
            const newData = result.khoxe || [];

            const prevData = prevStockDataRef.current;
            if (prevData.length === 0) {
                setStockData(newData);
                return;
            }

            const getStateString = (v: StockVehicle) => `${v['Trạng thái']}|${v['Người Giữ Xe'] || ''}`;
            const prevDataMap = new Map(prevData.map(v => [v.VIN, getStateString(v)]));

            const changedVins = new Set<string>();
            newData.forEach((newVehicle: StockVehicle) => {
                if (!newVehicle.VIN) return;
                const prevState = prevDataMap.get(newVehicle.VIN);
                const newState = getStateString(newVehicle);
                if (prevState !== undefined && prevState !== newState) {
                    changedVins.add(newVehicle.VIN);
                }
            });

            setStockData(newData);

            if (changedVins.size > 0) {
                showToast('Cập Nhật Kho Xe', `Có ${changedVins.size} xe vừa thay đổi trạng thái.`, 'info', 4000);
                setHighlightedVins(changedVins);
                setTimeout(() => setHighlightedVins(new Set()), 3000);
            }

        } catch (err) {
            console.warn("Real-time stock update failed:", err);
        }
    }, [showToast, setStockData]);

    useEffect(() => {
        const POLLING_INTERVAL = 15000;
        let intervalId: number | undefined;

        const startPolling = () => {
            stopPolling();
            handleRealtimeStockUpdate();
            // Also poll for invoice data
            refetchXuathoadon(true);

            intervalId = window.setInterval(() => {
                handleRealtimeStockUpdate();
                refetchXuathoadon(true);
            }, POLLING_INTERVAL);
        };

        const stopPolling = () => {
            if (intervalId) clearInterval(intervalId);
            intervalId = undefined;
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                startPolling();
            }
        };

        if (!isLoadingStock && !errorStock) {
            startPolling();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isLoadingStock, errorStock, handleRealtimeStockUpdate, refetchXuathoadon]);

    return {
        allHistoryData,
        setAllHistoryData,
        historyData,
        isLoadingHistory,
        errorHistory,
        refetchHistory,
        archivesLoadedFromCache,

        stockData,
        setStockData,
        isLoadingStock,
        errorStock,
        refetchStock,
        highlightedVins,

        soldData,
        isLoadingSold,
        errorSold,
        refetchSold,

        testDriveData,
        setTestDriveData,
        isLoadingTestDrive,
        refetchTestDrive,

        xuathoadonData,
        isLoadingXuathoadon,
        errorXuathoadon,
        refetchXuathoadon,

        teamData,
        allUsers,
        fetchAdminData,
        usersToView
    };
};
