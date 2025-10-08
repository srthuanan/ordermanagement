import { LOGIN_API_URL } from '../constants';
declare const axios: any;

export const userToConsultantMap: Record<string, string> = {
    'admin': 'PHẠM THÀNH NHÂN', 'bachttn': 'TRẦN THỊ NGUYỆT BẠCH', 'thangtq': 'TỐNG QUỐC THẮNG', 'vinhtn': 'THÀNH NGỌC VINH',
    'taone': 'PHẠM NHÂN', 'thaont': 'NGUYỄN THIỆN THẢO', 'tuanna': 'NGUYỄN ANH TUẤN', 'nhandt': 'ĐINH TRỌNG NHÂN',
    'thanhnth': 'NGUYỄN TRẦN HOÀNG THANH', 'phucnh': 'NGUYỄN HOÀNG PHÚC', 'phuongtd': 'TRẦN DANH PHƯƠNG', 'tuongtb': 'TẤT BÁCH TƯỜNG',
    'vinhl': 'LÝ KIM VINH', 'nguyenhtt': 'HỒ THỊ THẢO NGUYÊN', 'huypt': 'PHẠM TRỌNG HUY', 'giapnv': 'NGUYỄN VĂN GIÁP',
    'haivv': 'VŨ VIẾT HẢI', 'nhungnth': 'NGUYỄN THỊ HỒNG NHUNG', 'kydm': 'ĐÀO MINH KÝ', 'ngaptt': 'PHẠM THỊ THÚY NGA',
    'tannd': 'NGUYỄN DUY TÂN', 'ducdt': 'ĐINH TÀI ĐỨC', 'dattt': 'TỐNG THÀNH ĐẠT', 'haink': 'NGUYỄN KIM HẢI',
    'xuyennb': 'NGUYỄN BẢO XUYÊN', 'diennt': 'NGUYỄN THỊ DIỆN', 'trungnm': 'NGUYỄN MINH TRUNG', 'cant': 'NGUYỄN THANH CẢ',
    'tienna': 'NGUYỄN ANH TIẾN', 'namlv': 'LÊ VĂN NAM', 'tramhdt': 'HUỲNH DIỆP THANH TRÂM', 'thanhldv': 'LÊ DƯ VĂN THÀNH', 'chinhtc': 'TRANG CÔNG CHÍNH',
};

interface LoginResult {
    success: boolean;
    message?: string;
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
        const response = await axios.post(LOGIN_API_URL, null, { params: { action: "login", username, password } });
        if (response.data.success) {
            const consultantName = userToConsultantMap[response.data.username.toLowerCase()] || response.data.username;
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", response.data.username);
            sessionStorage.setItem("currentConsultant", consultantName);
            return { success: true };
        } else {
            return { success: false, message: response.data.message || "Tên đăng nhập hoặc mật khẩu không đúng." };
        }
    } catch (error) {
        console.error("Login API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

export const logout = () => {
    sessionStorage.clear();
};
