import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const getStatusInfo = (statusText: string): { className: string, icon: string, pulse: boolean } => {
    if (!statusText || typeof statusText !== 'string') {
        return { className: 'status-default', icon: 'fa-question-circle', pulse: false };
    }
    const lowerStatus = statusText.toLowerCase().trim().normalize('NFC');

    switch (lowerStatus) {
        // Negative
        case 'đã hủy': case 'đã hủy (ui)': return { className: 'status-da-huy', icon: 'fa-times-circle', pulse: false };
        case 'từ chối ycvc': return { className: 'status-tu-choi-ycvc', icon: 'fa-ban', pulse: false };

        // Pending / Waiting
        case 'chưa ghép': case 'chưa tìm thấy vin': return { className: 'status-chua-ghep', icon: 'fa-check-circle', pulse: false };
        case 'chờ phê duyệt': return { className: 'status-cho-phe-duyet', icon: 'fa-hourglass-half', pulse: false };
        case 'chờ ký hóa đơn': case 'chờ ký hóa đơn': return { className: 'status-cho-ky-hoa-don', icon: 'fa-file-signature', pulse: false };
        case 'chờ duyệt ycvc': return { className: 'status-cho-duyet-ycvc', icon: 'fa-user-clock', pulse: false };
        case 'chờ check-in': return { className: 'status-cho-check-in', icon: 'fa-calendar-check', pulse: false };

        // Action Required
        case 'yêu cầu bổ sung': return { className: 'status-yeu-cau-bo-sung', icon: 'fa-exclamation-circle', pulse: true };
        case 'chờ xác thực vc (tvbh)': return { className: 'status-cho-xac-thuc-vc', icon: 'fa-exclamation-circle', pulse: true };

        // In Progress
        case 'đang giữ': return { className: 'status-dang-giu', icon: 'fa-lock', pulse: false };
        case 'đang lái thử': return { className: 'status-dang-lai-thu', icon: 'fa-car-side', pulse: false }; // Changed icon
        case 'đã ghép': return { className: 'status-da-ghep', icon: 'fa-link', pulse: false };

        // Positive / Completed
        case 'đã bổ sung': return { className: 'status-da-bo-sung', icon: 'fa-plus-circle', pulse: false };
        case 'đã phê duyệt': return { className: 'status-da-phe-duyet', icon: 'fa-check', pulse: false };
        case 'đã xuất hóa đơn': return { className: 'status-da-xuat-hoa-don', icon: 'fa-check-double', pulse: false };
        case 'yêu cầu vinclub': return { className: 'status-yeu-cau-vinclub', icon: 'fa-star', pulse: false };
        case 'đã có vc': return { className: 'status-da-co-vc', icon: 'fa-star-half-alt', pulse: false };
        case 'đã hoàn tất': return { className: 'status-da-hoan-tat', icon: 'fa-flag-checkered', pulse: false };

        default:
            if (lowerStatus.startsWith('vpas') || /^[a-z0-9]{17}$/.test(lowerStatus)) {
                return { className: 'status-san-sang', icon: 'fa-car', pulse: false };
            }
            return { className: 'status-default', icon: 'fa-question-circle', pulse: false };
    }
};


const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { className, icon, pulse } = getStatusInfo(status);

  return (
    <div className={`status-badge ${className} ${pulse ? 'pulse-icon' : ''}`}>
      <span className="badge-icon">
        <i className={`fas ${icon}`}></i>
      </span>
      <span className="badge-text truncate">{status}</span>
    </div>
  );
};

export default StatusBadge;