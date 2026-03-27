import { useGlobalNotificationContext } from '../components/context/GlobalNotificationContext';

export const useGlobalNotification = () => {
    return useGlobalNotificationContext();
};
