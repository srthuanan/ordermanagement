import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const getStatusDetails = (statusText: string): { className: string; icon: string } => {
    if (!statusText || typeof statusText !== 'string') {
        return { className: 'status-default', icon: 'fa-info-circle' };
    }
    const lowerStatus = statusText.toLowerCase().trim().normalize('NFC');

    switch (lowerStatus) {
        // Negative Statuses
        case 'đã hủy':
        case 'đã hủy (ui)':
            return { className: 'status-da-huy', icon: 'fa-times-circle' };
        case 'từ chối ycvc':
            return { className: 'status-tu-choi-ycvc', icon: 'fa-ban' };
        
        // Pending/Waiting Statuses
        case 'chưa ghép':
        case 'chưa tìm thấy vin':
            return { className: 'status-chua-ghep', icon: 'fa-hourglass-half' };
        case 'chờ phê duyệt':
            return { className: 'status-cho-phe-duyet', icon: 'fa-gavel' };
        case 'chờ ký hóa đơn':
        case 'chờ ký hóa đơn':
             return { className: 'status-cho-ky-hoa-don', icon: 'fa-file-signature' };
        case 'chờ duyệt ycvc':
             return { className: 'status-cho-duyet-ycvc', icon: 'fa-user-clock' };

        // Test Drive Statuses
        case 'chờ check-in':
            return { className: 'status-cho-check-in', icon: 'fa-hourglass-start' };
        case 'đang lái thử':
            return { className: 'status-dang-lai-thu', icon: 'fa-road' };
        case 'đã hoàn tất':
            return { className: 'status-da-hoan-tat', icon: 'fa-flag-checkered' };

        // Action Required Status
        case 'yêu cầu bổ sung':
            return { className: 'status-yeu-cau-bo-sung', icon: 'fa-edit' };
        case 'chờ xác thực vc (tvbh)':
            return { className: 'status-yeu-cau-bo-sung', icon: 'fa-user-check' };

        // In Progress Statuses
        case 'đang giữ':
            return { className: 'status-dang-giu', icon: 'fa-pause-circle' };
        case 'đã ghép':
            return { className: 'status-da-ghep', icon: 'fa-link' };
        case 'xe trưng bày':
            return { className: 'status-default', icon: 'fa-store' };

        // Positive/Completed Statuses
        case 'đã bổ sung':
            return { className: 'status-da-bo-sung', icon: 'fa-plus-circle' };
        case 'đã phê duyệt':
            return { className: 'status-da-phe-duyet', icon: 'fa-check-double' };
        case 'đã xuất hóa đơn':
            return { className: 'status-da-xuat-hoa-don', icon: 'fa-file-invoice-dollar' };
        case 'yêu cầu vinclub':
            return { className: 'status-yeu-cau-vinclub', icon: 'fa-id-card' };
        case 'đã có vc':
            return { className: 'status-san-sang', icon: 'fa-id-badge' };

        default:
            if (lowerStatus.startsWith('vpas') || /^[a-z0-9]{17}$/.test(lowerStatus)) {
                return { className: 'status-san-sang', icon: 'fa-check-circle' };
            }
            return { className: 'status-default', icon: 'fa-info-circle' };
    }
};


const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { className, icon } = getStatusDetails(status);

  return (
    <div className={`status-badge ${className}`}>
      <i className={`fas ${icon}`}></i>
      <span className="truncate">{status}</span>
    </div>
  );
};

export default StatusBadge;