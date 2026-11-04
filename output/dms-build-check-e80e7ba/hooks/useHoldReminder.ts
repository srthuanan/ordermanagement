import { useEffect, useRef } from 'react';
import moment from 'moment';
import * as apiService from '../services/apiService';
import { StockVehicle } from '../types';

interface UseHoldReminderProps {
    stockData: StockVehicle[];
    currentUser: string;
    username: string;
}

export const useHoldReminder = ({ stockData, currentUser, username }: UseHoldReminderProps) => {
    const lastCheckRef = useRef<number>(0);

    useEffect(() => {
        const checkExpiringHolds = async () => {
            const now = Date.now();
            // Chỉ kiểm tra mỗi phút 1 lần
            if (now - lastCheckRef.current < 60000) return;
            lastCheckRef.current = now;

            const myHolds = stockData.filter(car => 
                car['Người Giữ Xe'] === currentUser && 
                car['Trạng thái'] === 'Đang giữ' &&
                car['Thời Gian Hết Hạn Giữ']
            );

            for (const car of myHolds) {
                const expiry = moment(car['Thời Gian Hết Hạn Giữ'], 'DD/MM/YYYY HH:mm:ss');
                const diffMinutes = expiry.diff(moment(), 'minutes');

                // Nếu còn từ 0 đến 20 phút
                if (diffMinutes <= 20 && diffMinutes > 0) {
                    const storageKey = `hold_remind_${car.VIN}_${expiry.unix()}`;
                    const alreadySent = localStorage.getItem(storageKey);

                    if (!alreadySent) {
                        try {
                            await apiService.createNotification({
                                message: `Xe ${car.VIN} của bạn sắp hết hạn giữ (còn ${diffMinutes} phút). Hãy gửi minh chứng nếu muốn gia hạn!`,
                                type: 'warning',
                                recipient: username,
                                targetView: 'stock',
                                targetId: car.VIN
                            });
                            localStorage.setItem(storageKey, 'true');
                            console.log(`Sent hold reminder for ${car.VIN}`);
                        } catch (err) {
                            console.error("Failed to send hold reminder:", err);
                        }
                    }
                }
            }
        };

        const interval = setInterval(checkExpiringHolds, 30000); // Check every 30s
        checkExpiringHolds();

        return () => clearInterval(interval);
    }, [stockData, currentUser, username]);
};
