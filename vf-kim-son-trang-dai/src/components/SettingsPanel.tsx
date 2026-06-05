import React, { useState } from 'react';
import { Settings, Plus, Trash2, Car, PaintBucket, Armchair, GitBranch, BadgeDollarSign, Pencil } from 'lucide-react';
import { VehicleConfigRow, SalesPolicyRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'lines' | 'exteriors' | 'interiors' | 'policies'>('lines');
  
  const [newLine, setNewLine] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [newVersion, setNewVersion] = useState('');
  
  const [newExterior, setNewExterior] = useState('');
  const [newInterior, setNewInterior] = useState('');

  const [policies, setPolicies] = useState<SalesPolicyRow[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyLine, setNewPolicyLine] = useState('');
  const [newPolicyStatus, setNewPolicyStatus] = useState('Hoạt động');
  const [newPolicyExpiry, setNewPolicyExpiry] = useState('');
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editConfigValue, setEditConfigValue] = useState('');

  const [editPolicyData, setEditPolicyData] = useState({ name: '', line: '', expiry: '', status: 'Hoạt động' });

  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const lineDropdownRef = React.useRef<HTMLDivElement>(null);
  const inlineDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lineDropdownRef.current && !lineDropdownRef.current.contains(event.target as Node)) {
        setIsAddDropdownOpen(false);
      }
      if (inlineDropdownRef.current && !inlineDropdownRef.current.contains(event.target as Node)) {
        setIsInlineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lines = configs.filter(c => c.type === 'line').sort((a, b) => a.value.localeCompare(b.value));
  const versions = configs.filter(c => c.type === 'version' && c.parent_value === selectedLine).sort((a, b) => a.value.localeCompare(b.value));
  const exteriors = configs.filter(c => c.type === 'exterior').sort((a, b) => a.value.localeCompare(b.value));
  const interiors = configs.filter(c => c.type === 'interior').sort((a, b) => a.value.localeCompare(b.value));

  // Set default selected line
  React.useEffect(() => {
    if (lines.length > 0 && !selectedLine) {
      setSelectedLine(lines[0].value);
    }
  }, [lines, selectedLine]);

  React.useEffect(() => {
    if (activeSubTab === 'policies') {
      loadPolicies();
    }
  }, [activeSubTab]);

  const loadPolicies = async () => {
    const { data } = await apiService.getAllSalesPolicies();
    setPolicies(data);
  };

  const handleAddLine = async () => {
    const val = newLine.trim();
    if (!val) return;
    if (lines.some(l => l.value.toLowerCase() === val.toLowerCase())) {
      alert('Dòng xe đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'line', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm dòng xe: ${error.message}`);
      return;
    }
    setNewLine('');
    setSelectedLine(val);
    onRefresh();
  };

  const handleAddVersion = async () => {
    const val = newVersion.trim();
    if (!val || !selectedLine) return;
    if (versions.some(v => v.value.toLowerCase() === val.toLowerCase())) {
      alert('Phiên bản đã tồn tại cho dòng xe này!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'version', value: val, parent_value: selectedLine });
    if (error) {
      alert(`Lỗi thêm phiên bản: ${error.message}`);
      return;
    }
    setNewVersion('');
    onRefresh();
  };

  const handleAddExterior = async () => {
    const val = newExterior.trim();
    if (!val) return;
    if (exteriors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu ngoại thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'exterior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu ngoại thất: ${error.message}`);
      return;
    }
    setNewExterior('');
    onRefresh();
  };

  const handleAddInterior = async () => {
    const val = newInterior.trim();
    if (!val) return;
    if (interiors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu nội thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'interior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu nội thất: ${error.message}`);
      return;
    }
    setNewInterior('');
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      const { error } = await apiService.deleteVehicleConfig(id);
      if (error) {
        alert(`Lỗi xóa: ${error.message}`);
        return;
      }
      onRefresh();
    }
  };

  const handleSaveEditConfig = async (config: VehicleConfigRow) => {
    const val = editConfigValue.trim();
    if (!val || val === config.value) {
      setEditingConfigId(null);
      return;
    }

    const siblings = configs.filter(c => c.type === config.type && c.parent_value === config.parent_value && c.id !== config.id);
    if (siblings.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Giá trị này đã tồn tại!');
      return;
    }

    const { error } = await apiService.updateVehicleConfig(config.id!, { value: val });
    if (error) {
      alert(`Lỗi cập nhật: ${error.message}`);
      return;
    }

    if (config.type === 'line') {
      const children = configs.filter(c => c.type === 'version' && c.parent_value === config.value);
      for (const child of children) {
        await apiService.updateVehicleConfig(child.id!, { parent_value: val });
      }
      if (selectedLine === config.value) setSelectedLine(val);
    }

    setEditingConfigId(null);
    onRefresh();
  };

  const handleAddPolicy = async () => {
    const val = newPolicyName.trim();
    if (!val) return;
    
    const { error } = await apiService.createSalesPolicy({
      ten_chinh_sach: val,
      dong_xe: newPolicyLine.trim() || 'Tất cả',
      trang_thai: newPolicyStatus,
      han_su_dung: newPolicyExpiry.trim() || null
    });
    if (error) {
      alert(`Lỗi thêm chính sách: ${error.message}`);
      return;
    }
    
    setNewPolicyName('');
    setNewPolicyLine('');
    setNewPolicyExpiry('');
    setNewPolicyStatus('Hoạt động');
    loadPolicies();
  };

  const handleSaveInlinePolicy = async () => {
    if (!editPolicyData.name.trim() || !editingPolicyId) return;
    const { error } = await apiService.updateSalesPolicy(editingPolicyId, {
      ten_chinh_sach: editPolicyData.name,
      dong_xe: editPolicyData.line.trim() || 'Tất cả',
      trang_thai: editPolicyData.status,
      han_su_dung: editPolicyData.expiry.trim() || null
    });
    if (error) {
      alert(`Lỗi cập nhật chính sách: ${error.message}`);
      return;
    }
    setEditingPolicyId(null);
    loadPolicies();
  };

  const handleEditPolicy = (p: SalesPolicyRow) => {
    setEditingPolicyId(p.id!);
    setEditPolicyData({ name: p.ten_chinh_sach, line: p.dong_xe || '', expiry: p.han_su_dung || '', status: p.trang_thai || 'Hoạt động' });
  };

  const handleCancelEditPolicy = () => {
    setEditingPolicyId(null);
  };

  const handleDeletePolicy = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      const { error } = await apiService.deleteSalesPolicy(id);
      if (error) {
        alert(`Lỗi xóa chính sách: ${error.message}`);
        return;
      }
      loadPolicies();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', padding: '20px', gap: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Settings size={28} className="text-primary" />
        <h1 style={{ fontSize: '24px', color: '#0f172a', margin: 0, fontWeight: 700 }}>Cấu hình hệ thống</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <button
          className={activeSubTab === 'lines' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('lines')}
        >
          <Car size={18} /> Dòng xe & Phiên bản
        </button>
        <button
          className={activeSubTab === 'exteriors' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('exteriors')}
        >
          <PaintBucket size={18} /> Màu ngoại thất
        </button>
        <button
          className={activeSubTab === 'interiors' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('interiors')}
        >
          <Armchair size={18} /> Màu nội thất
        </button>
        <button
          className={activeSubTab === 'policies' ? 'primary-button' : 'ghost-button'}
          onClick={() => setActiveSubTab('policies')}
        >
          <BadgeDollarSign size={18} /> Chính sách bán hàng
        </button>
      </div>

      {activeSubTab === 'lines' && (
        <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Cột Dòng xe */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Car size={18} /> Dòng xe</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Tên dòng xe (VD: VF 5)..." 
                value={newLine} 
                onChange={(e) => setNewLine(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <button className="primary-button" onClick={handleAddLine} disabled={!newLine.trim()}>Thêm</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {lines.map(line => (
                <div 
                  key={line.id} 
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: selectedLine === line.value ? '#f0fdf4' : 'transparent',
                    borderLeft: selectedLine === line.value ? '3px solid #16a34a' : '3px solid transparent'
                  }}
                  onClick={() => setSelectedLine(line.value)}
                >
                  {editingConfigId === line.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editConfigValue} 
                        onChange={(e) => setEditConfigValue(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)}
                        autoFocus
                        style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      />
                      <button className="primary-button" style={{ padding: '4px 12px' }} onClick={() => handleSaveEditConfig(line)}>Lưu</button>
                      <button className="ghost-button" style={{ padding: '4px 12px' }} onClick={() => setEditingConfigId(null)}>Hủy</button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: selectedLine === line.value ? 700 : 500, flex: 1 }}>{line.value}</span>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-button" style={{ color: '#3b82f6' }} onClick={(e) => { e.stopPropagation(); setEditingConfigId(line.id!); setEditConfigValue(line.value); }}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-button" style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(line.id!, line.value); }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cột Phiên bản */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={18} /> Phiên bản của {selectedLine || '...'}
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Tên phiên bản (VD: Plus)..." 
                value={newVersion} 
                onChange={(e) => setNewVersion(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddVersion()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                disabled={!selectedLine}
              />
              <button className="primary-button" onClick={handleAddVersion} disabled={!newVersion.trim() || !selectedLine}>Thêm</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {versions.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>Chưa có phiên bản nào.</p>
              ) : (
                versions.map(version => (
                  <div key={version.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                    {editingConfigId === version.id ? (
                      <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                        <input 
                          type="text" 
                          value={editConfigValue} 
                          onChange={(e) => setEditConfigValue(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(version)}
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                        />
                        <button className="primary-button" style={{ padding: '4px 12px' }} onClick={() => handleSaveEditConfig(version)}>Lưu</button>
                        <button className="ghost-button" style={{ padding: '4px 12px' }} onClick={() => setEditingConfigId(null)}>Hủy</button>
                      </div>
                    ) : (
                      <span style={{ flex: 1 }}>{version.value}</span>
                    )}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="icon-button" style={{ color: '#3b82f6' }} onClick={() => { setEditingConfigId(version.id!); setEditConfigValue(version.value); }}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(version.id!, version.value)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'exteriors' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><PaintBucket size={18} /> Danh sách Màu Ngoại thất</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '500px' }}>
            <input 
              type="text" 
              placeholder="VD: Trắng Brahminy (CE18)" 
              value={newExterior} 
              onChange={(e) => setNewExterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button className="primary-button" onClick={handleAddExterior} disabled={!newExterior.trim()}>Thêm mới</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {exteriors.map(ext => (
              <div key={ext.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {editingConfigId === ext.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                    <input 
                      type="text" 
                      value={editConfigValue} 
                      onChange={(e) => setEditConfigValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                    <button className="primary-button" style={{ padding: '4px 12px' }} onClick={() => handleSaveEditConfig(ext)}>Lưu</button>
                    <button className="ghost-button" style={{ padding: '4px 12px' }} onClick={() => setEditingConfigId(null)}>Hủy</button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 500, color: '#334155', flex: 1 }}>{ext.value}</span>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="icon-button" style={{ color: '#3b82f6' }} onClick={() => { setEditingConfigId(ext.id!); setEditConfigValue(ext.value); }}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(ext.id!, ext.value)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'interiors' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Armchair size={18} /> Danh sách Màu Nội thất</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '500px' }}>
            <input 
              type="text" 
              placeholder="VD: Đen" 
              value={newInterior} 
              onChange={(e) => setNewInterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button className="primary-button" onClick={handleAddInterior} disabled={!newInterior.trim()}>Thêm mới</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {interiors.map(int => (
              <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {editingConfigId === int.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                    <input 
                      type="text" 
                      value={editConfigValue} 
                      onChange={(e) => setEditConfigValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                    <button className="primary-button" style={{ padding: '4px 12px' }} onClick={() => handleSaveEditConfig(int)}>Lưu</button>
                    <button className="ghost-button" style={{ padding: '4px 12px' }} onClick={() => setEditingConfigId(null)}>Hủy</button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 500, color: '#334155', flex: 1 }}>{int.value}</span>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="icon-button" style={{ color: '#3b82f6' }} onClick={() => { setEditingConfigId(int.id!); setEditConfigValue(int.value); }}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDelete(int.id!, int.value)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'policies' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><BadgeDollarSign size={18} /> Quản lý Chính sách bán hàng</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Tên chính sách</label>
              <input 
                type="text" 
                placeholder="VD: Chương trình ưu đãi VF 5..." 
                value={newPolicyName} 
                onChange={(e) => setNewPolicyName(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div ref={lineDropdownRef} style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Dòng xe áp dụng</label>
              <div 
                onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', minHeight: '38px', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: newPolicyLine ? '#0f172a' : '#64748b' }}>
                  {newPolicyLine || 'Tất cả các dòng xe'}
                </span>
              </div>
              
              {isAddDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <div 
                    onClick={() => setNewPolicyLine('')}
                    style={{ padding: '8px 12px', cursor: 'pointer', background: !newPolicyLine ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0' }}
                  >
                    <input type="checkbox" checked={!newPolicyLine} readOnly style={{ cursor: 'pointer' }} />
                    <span style={{ fontWeight: 500 }}>Tất cả các dòng xe</span>
                  </div>
                  {lines.map(l => {
                    const currentLines = newPolicyLine ? newPolicyLine.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentLines.includes(l.value);
                    return (
                      <div 
                        key={l.id} 
                        onClick={() => {
                          let updated = [...currentLines];
                          if (isSelected) {
                            updated = updated.filter(item => item !== l.value);
                          } else {
                            updated.push(l.value);
                          }
                          setNewPolicyLine(updated.join(', '));
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer', background: isSelected ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                        <span>{l.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Hạn sử dụng</label>
              <input 
                type="text" 
                placeholder="VD: Đến 30/06/2026" 
                value={newPolicyExpiry} 
                onChange={(e) => setNewPolicyExpiry(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Trạng thái</label>
              <select 
                value={newPolicyStatus} 
                onChange={(e) => setNewPolicyStatus(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="Hoạt động">Hoạt động</option>
                <option value="Ngừng hoạt động">Ngừng hoạt động</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="primary-button" onClick={handleAddPolicy} disabled={!newPolicyName.trim()} style={{ height: '38px' }}>
                Thêm mới
              </button>
            </div>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Tên chính sách</th>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Dòng xe áp dụng</th>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Hạn sử dụng</th>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(p => {
                  if (editingPolicyId === p.id) {
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px' }}>
                          <input type="text" value={editPolicyData.name} onChange={e => setEditPolicyData({...editPolicyData, name: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div ref={inlineDropdownRef} style={{ position: 'relative' }}>
                            <div 
                              onClick={() => setIsInlineDropdownOpen(!isInlineDropdownOpen)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', minHeight: '34px', display: 'flex', alignItems: 'center' }}
                            >
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: editPolicyData.line ? '#0f172a' : '#64748b', fontSize: '13px' }}>
                                {editPolicyData.line || 'Tất cả'}
                              </span>
                            </div>
                            {isInlineDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', zIndex: 9999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                <div 
                                  onClick={() => setEditPolicyData({...editPolicyData, line: ''})}
                                  style={{ padding: '8px 12px', cursor: 'pointer', background: !editPolicyData.line ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}
                                >
                                  <input type="checkbox" checked={!editPolicyData.line} readOnly style={{ cursor: 'pointer' }} />
                                  <span style={{ fontWeight: 500 }}>Tất cả các dòng xe</span>
                                </div>
                                {lines.map(l => {
                                  const currentLines = editPolicyData.line ? editPolicyData.line.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  const isSelected = currentLines.includes(l.value);
                                  return (
                                    <div 
                                      key={l.id} 
                                      onClick={() => {
                                        let updated = [...currentLines];
                                        if (isSelected) {
                                          updated = updated.filter(item => item !== l.value);
                                        } else {
                                          updated.push(l.value);
                                        }
                                        setEditPolicyData({...editPolicyData, line: updated.join(', ')});
                                      }}
                                      style={{ padding: '8px 12px', cursor: 'pointer', background: isSelected ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                                    >
                                      <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                                      <span>{l.value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="text" value={editPolicyData.expiry} onChange={e => setEditPolicyData({...editPolicyData, expiry: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={editPolicyData.status} onChange={e => setEditPolicyData({...editPolicyData, status: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button className="primary-button" style={{ padding: '4px 12px' }} onClick={handleSaveInlinePolicy}>Lưu</button>
                          <button className="ghost-button" style={{ padding: '4px 12px' }} onClick={handleCancelEditPolicy}>Hủy</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{p.ten_chinh_sach}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{p.dong_xe || 'Tất cả'}</td>
                      <td style={{ padding: '12px', color: '#475569', fontSize: '13px' }}>{p.han_su_dung || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: p.trang_thai === 'Hoạt động' ? '#dcfce7' : '#f1f5f9',
                          color: p.trang_thai === 'Hoạt động' ? '#16a34a' : '#64748b'
                        }}>
                          {p.trang_thai || 'Hoạt động'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="icon-button" style={{ color: '#3b82f6' }} onClick={() => handleEditPolicy(p)}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleDeletePolicy(p.id!, p.ten_chinh_sach)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
