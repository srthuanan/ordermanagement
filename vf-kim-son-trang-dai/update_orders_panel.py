import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\OrdersPanel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add AlertTriangle to lucide-react import
if 'AlertTriangle' not in content:
    content = content.replace("import { Search, Filter, Plus, Edit2, FileText, Send, Car, RefreshCw, XCircle, Trash2, MapPin, X, Info } from 'lucide-react';", 
                              "import { Search, Filter, Plus, Edit2, FileText, Send, Car, RefreshCw, XCircle, Trash2, MapPin, X, Info, AlertTriangle } from 'lucide-react';")

# 2. Update Mobile List Item
old_mobile_btn = """                    return (
                      <button
                        key={order.id}
                        className={`orders-mobile-card ${isActive ? 'orders-mobile-card-active' : ''}`}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsDetailPanelOpen(true);
                          setMobileView('detail');
                        }}
                      >"""
new_mobile_btn = """                    return (
                      <button
                        key={order.id}
                        className={`orders-mobile-card ${isActive ? 'orders-mobile-card-active' : ''}`}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsDetailPanelOpen(true);
                          setMobileView('detail');
                        }}
                        style={{ borderColor: order.isWarning ? '#fecdd3' : undefined, backgroundColor: order.isWarning ? '#fff1f2' : undefined }}
                      >"""

# Mobile title
old_mobile_title = """                          <div className="orders-mobile-card-header">
                            <span style={{ fontWeight: 800, color: '#0f766e', fontSize: '13.5px' }}>{order.id}</span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{order.createdAt.split(' ')[0]}</span>
                          </div>"""
new_mobile_title = """                          <div className="orders-mobile-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: order.isWarning ? '#e11d48' : '#0f766e', fontSize: '13.5px' }}>{order.id}</span>
                              {order.isWarning && <AlertTriangle size={14} color="#e11d48" />}
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{order.createdAt.split(' ')[0]}</span>
                          </div>"""


# 3. Update Desktop List Item
old_desktop_tr = """                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setIsDetailPanelOpen(true);
                            if (isMobile) {
                              setMobileView('detail');
                            }
                          }}
                          className={isActive ? 'active-row' : ''}
                          style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        >"""
new_desktop_tr = """                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setIsDetailPanelOpen(true);
                            if (isMobile) {
                              setMobileView('detail');
                            }
                          }}
                          className={`${isActive ? 'active-row' : ''} ${order.isWarning ? 'warning-row' : ''}`}
                          style={{ cursor: 'pointer', transition: 'background 0.15s', backgroundColor: order.isWarning ? '#fff1f2' : undefined }}
                        >"""

old_desktop_td1 = """                          <td style={{ fontWeight: 700, color: '#0f766e' }}>
                            {order.id}
                          </td>"""
new_desktop_td1 = """                          <td style={{ fontWeight: 700, color: order.isWarning ? '#e11d48' : '#0f766e', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: 'none' }}>
                            {order.id}
                            {order.isWarning && <AlertTriangle size={14} color="#e11d48" title={order.warningMessage} />}
                          </td>"""

content = content.replace(old_mobile_btn, new_mobile_btn)
content = content.replace(old_mobile_title, new_mobile_title)
content = content.replace(old_desktop_tr, new_desktop_tr)
content = content.replace(old_desktop_td1, new_desktop_td1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("OrdersPanel.tsx rewritten successfully.")
