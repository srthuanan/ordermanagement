import { useState, useEffect } from 'react';

export const useNightMode = () => {
    const [isNight, setIsNight] = useState(false);

    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            // Đêm từ 18:00 tối đến 5:59 sáng
            setIsNight(hour >= 18 || hour < 6);
        };
        
        checkTime();
        // Cập nhật mỗi phút
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return isNight;
};
