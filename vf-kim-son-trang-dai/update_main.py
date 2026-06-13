import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\main.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Import AlertTriangle
if 'AlertTriangle' not in content:
    content = content.replace("import { Menu, X, Package, LayoutDashboard, Send, FileCheck, Info, UserCog, User, Edit3 } from 'lucide-react';",
                              "import { Menu, X, Package, LayoutDashboard, Send, FileCheck, Info, UserCog, User, Edit3, AlertTriangle } from 'lucide-react';")

# 2. Add count calculation
count_logic = """  // Đếm số đơn cảnh báo
  const slaWarningCount = useMemo(() => {
    return orders.filter(o => o.isWarning).length;
  }, [orders]);"""

if 'const slaWarningCount' not in content:
    idx = content.find('const availableStock = useMemo(')
    if idx != -1:
        content = content[:idx] + count_logic + "\n\n  " + content[idx:]

# 3. Add UI toast at the end of main-content
toast_ui = """        {/* Cảnh báo SLA Global */}
        {slaWarningCount > 0 && canViewNotifications(userRole) && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', zIndex: 9999 }}>
            <AlertTriangle size={20} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Cảnh báo tiến độ!</span>
              <span style={{ fontSize: '12.5px', opacity: 0.9 }}>Có {slaWarningCount} đơn hàng bị quá hạn XHĐ.</span>
            </div>
            <button 
              onClick={() => {
                setActiveTab('orders');
                setSidebarOpen(false);
              }}
              style={{ background: 'white', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginLeft: '10px' }}>
              Xem ngay
            </button>
          </div>
        )}"""

if 'Cảnh báo SLA Global' not in content:
    idx = content.find('</main>')
    if idx != -1:
        content = content[:idx] + toast_ui + "\n      " + content[idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("main.tsx rewritten successfully.")
