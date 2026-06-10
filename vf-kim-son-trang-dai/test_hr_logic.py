import json

# ==========================================
# 1. MOCK DATA (Dữ liệu giả lập)
# ==========================================

profiles = [
    {"id": "1", "email": "admin@congty.com", "full_name": "Nguyen Van Admin", "role": "admin", "department": "Ban Giám Đốc"},
    {"id": "2", "email": "giamdoc@congty.com", "full_name": "Tran Van Giam Doc", "role": "manager", "department": "Ban Giám Đốc"},
    {"id": "3", "email": "tpkd1@congty.com", "full_name": "Le Van TPKD 1", "role": "manager", "department": "Phòng Kinh Doanh 1"},
    {"id": "4", "email": "tpkd2@congty.com", "full_name": "Pham Van TPKD 2", "role": "manager", "department": "Phòng Kinh Doanh 2"},
    {"id": "5", "email": "tvbh1_a@congty.com", "full_name": "Nhan Vien 1A", "role": "sales", "department": "Phòng Kinh Doanh 1"},
    {"id": "6", "email": "tvbh1_b@congty.com", "full_name": "Nhan Vien 1B", "role": "sales", "department": "Phòng Kinh Doanh 1"},
    {"id": "7", "email": "tvbh2_a@congty.com", "full_name": "Nhan Vien 2A", "role": "sales", "department": "Phòng Kinh Doanh 2"},
]

requests_list = [
    {"id": "req_1", "requester_id": "5", "requester_username": "tvbh1_a@congty.com", "requester_name": "Nhan Vien 1A", "type": "nghi_phep", "status": "pending"},
    {"id": "req_2", "requester_id": "6", "requester_username": "tvbh1_b@congty.com", "requester_name": "Nhan Vien 1B", "type": "di_tre", "status": "pending"},
    {"id": "req_3", "requester_id": "7", "requester_username": "tvbh2_a@congty.com", "requester_name": "Nhan Vien 2A", "type": "nghi_phep", "status": "approved"},
    {"id": "req_4", "requester_id": "3", "requester_username": "tpkd1@congty.com", "requester_name": "Le Van TPKD 1", "type": "nghi_phep", "status": "pending"},
]

# ==========================================
# 2. FILTERING LOGIC (Logic phân quyền y hệt như frontend)
# ==========================================

def get_viewable_requests(current_user):
    # Xác định quyền hạn của current_user
    isAdmin = current_user.get('role') == 'admin'
    isDirector = isAdmin or (current_user.get('role') == 'manager' and current_user.get('department') == 'Ban Giám Đốc')
    isTPKD = isAdmin or (current_user.get('role') == 'manager' and current_user.get('department') != 'Ban Giám Đốc')
    
    currentUsername = current_user.get('email')
    myDept = current_user.get('department')
    
    # Lọc danh sách
    viewable = []
    
    if isAdmin or isDirector:
        # Admin và Giám Đốc thấy tất cả
        viewable = requests_list.copy()
        
    elif isTPKD:
        # TPKD thấy đơn của chính mình + đơn của nhân viên cùng phòng ban
        for req in requests_list:
            if req.get('requester_username') == currentUsername:
                viewable.append(req)
            else:
                # Tìm user tương ứng với lá đơn để check phòng ban
                reqProfile = next((p for p in profiles if p.get('id') == req.get('requester_id') or p.get('email') == req.get('requester_username')), None)
                if reqProfile and reqProfile.get('department') == myDept:
                    viewable.append(req)
                    
    else:
        # Nhân viên bình thường chỉ thấy đơn của chính mình
        for req in requests_list:
            if req.get('requester_username') == currentUsername:
                viewable.append(req)
                
    return viewable

# ==========================================
# 3. CHẠY TEST
# ==========================================

def run_test():
    print("=== KIỂM TRA PHÂN QUYỀN XEM ĐƠN ===")
    print(f"Tổng số đơn trên hệ thống: {len(requests_list)}\n")
    
    # Lấy ra vài người để test
    test_users = [
        profiles[0], # Admin
        profiles[2], # TPKD 1 (Kinh doanh 1)
        profiles[3], # TPKD 2 (Kinh doanh 2)
        profiles[4], # Nhan vien 1A (Kinh doanh 1)
        profiles[6], # Nhan vien 2A (Kinh doanh 2)
    ]
    
    for user in test_users:
        viewable = get_viewable_requests(user)
        print(f"👤 Người dùng: {user['full_name']} | Role: {user['role']} | Dept: {user['department']}")
        print(f"   => Nhìn thấy {len(viewable)}/{len(requests_list)} đơn:")
        
        if len(viewable) == 0:
            print("      (Không có đơn nào)")
        else:
            for req in viewable:
                print(f"      - Đơn của: {req['requester_name']} | Trạng thái: {req['status']}")
        print("-" * 55)

if __name__ == '__main__':
    run_test()
