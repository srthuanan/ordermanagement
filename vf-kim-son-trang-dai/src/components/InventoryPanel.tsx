import React from 'react';
import { PackageCheck, X, Clock, FilePlus2, LocateFixed, Search, Filter, RotateCcw, ArrowLeft } from 'lucide-react';
import { InventoryItem, VehicleLocationRow } from '../types';
import { stockTone } from '../constants';
import { VehicleLocationMapPanel } from './VehicleLocationMapPanel';

interface InventoryPanelProps {
  items: InventoryItem[];
  vehicleLocations: VehicleLocationRow[];
  canManageInventory: boolean;
  canHoldVehicle: boolean;
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  isReleasingVin: string;
  isHoldingVin: string;
  isQueueingVin: string;
  isUpdatingVehicleLocation: string;
  queuedVins: string[];
  onOpenImport: () => void;
  onHoldItem: (item: InventoryItem) => void;
  onCreateOrderFromItem: (item: InventoryItem) => void;
  onReleaseItem: (vin: string) => void;
  onJoinQueue: (vin: string) => void;
  onLeaveQueue: (vin: string) => void;
  onUpdateVehicleLocation: (item: InventoryItem) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  items,
  vehicleLocations,
  canManageInventory,
  canHoldVehicle,
  currentUsername,
  canOverrideHeldVehicle,
  isReleasingVin,
  isHoldingVin,
  isQueueingVin,
  isUpdatingVehicleLocation,
  queuedVins,
  onOpenImport,
  onHoldItem,
  onCreateOrderFromItem,
  onReleaseItem,
  onJoinQueue,
  onLeaveQueue,
  onUpdateVehicleLocation
}) => {
  const [highlightedVin, setHighlightedVin] = React.useState<string | null>(null);
  const [selectedVin, setSelectedVin] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | InventoryItem['status']>('all');
  const [lineFilter, setLineFilter] = React.useState('all');
  const [versionFilter, setVersionFilter] = React.useState('all');
  const [exteriorFilter, setExteriorFilter] = React.useState('all');
  const [mobileView, setMobileView] = React.useState<'list' | 'detail'>('list');
  const [isMobile, setIsMobile] = React.useState(false);

  const lineOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.line).filter(Boolean))).sort(),
    [items]
  );

  const versionOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.version).filter(Boolean))).sort(),
    [items]
  );

  const exteriorOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.exterior).filter(Boolean))).sort(),
    [items]
  );

  const visibleItems = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.vin.toLowerCase().includes(query) ||
        item.line.toLowerCase().includes(query) ||
        item.version.toLowerCase().includes(query) ||
        item.exterior.toLowerCase().includes(query) ||
        item.interior.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.holder.toLowerCase().includes(query) ||
        item.engineNo.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesLine = lineFilter === 'all' || item.line === lineFilter;
      const matchesVersion = versionFilter === 'all' || item.version === versionFilter;
      const matchesExterior = exteriorFilter === 'all' || item.exterior === exteriorFilter;

      return matchesSearch && matchesStatus && matchesLine && matchesVersion && matchesExterior;
    });
  }, [items, searchText, statusFilter, lineFilter, versionFilter, exteriorFilter]);

  const visibleVehicleLocations = React.useMemo(() => {
    const visibleVinSet = new Set(visibleItems.map((item) => item.vin.trim().toUpperCase()));
    return vehicleLocations.filter((location) => visibleVinSet.has(location.vin.trim().toUpperCase()));
  }, [vehicleLocations, visibleItems]);

  const selectedItem = React.useMemo(
    () => visibleItems.find((item) => item.vin === selectedVin) ?? visibleItems[0] ?? null,
    [visibleItems, selectedVin]
  );

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  React.useEffect(() => {
    if (!visibleItems.length) {
      setSelectedVin(null);
      setMobileView('list');
      return;
    }
    if (!selectedVin || !visibleItems.some((item) => item.vin === selectedVin)) {
      setSelectedVin(visibleItems[0].vin);
    }
  }, [visibleItems, selectedVin]);

  React.useEffect(() => {
    if (!isMobile) setMobileView('list');
  }, [isMobile]);



  return (
    <section className={isMobile ? `panel inventory-dashboard ${mobileView === 'detail' ? 'inventory-mobile-detail' : 'inventory-mobile-list'}` : 'panel inventory-dashboard'}>




      {/* 70/30 Split Workspace */}
      <div className="inventory-modular-workspace">
        
        {/* Left Area (Data & Filters) */}
        <div className="inventory-data-side">
          {isMobile ? (
            <div className="inventory-mobile-shell">
              <div className="inventory-mobile-hero">
                <div className="inventory-mobile-hero-copy">
                  <p className="inventory-mobile-eyebrow">Kho xe</p>
                  <h2>Danh sách xe trong kho</h2>
                  <p>{visibleItems.length} / {items.length} xe</p>
                </div>
                {mobileView === 'list' && canManageInventory ? (
                  <button
                    className="icon-button inventory-mobile-import-button"
                    onClick={onOpenImport}
                    title="Nhập kho"
                    aria-label="Nhập kho"
                  >
                    <PackageCheck size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '4px 0 8px 0', 
              background: '#ffffff', 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <label className="search-box" style={{ flex: '2 1 240px', minHeight: '34px', height: '34px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', transition: 'all 0.2s' }}>
                <Search size={14} style={{ color: '#64748b' }} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm nhanh VIN, bãi xe, người giữ..."
                  style={{ fontSize: '12.5px' }}
                />
              </label>
              <label className="select-box" style={{ flex: '1 1 110px', minHeight: '34px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <Filter size={12} style={{ color: '#64748b' }} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  <option value="all">Tất cả TT</option>
                  <option value="Chưa ghép">Chưa ghép</option>
                  <option value="Đang giữ">Đang giữ</option>
                  <option value="Đã ghép">Đã ghép</option>
                </select>
              </label>
              <label className="select-box" style={{ flex: '1 1 110px', minHeight: '34px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <Filter size={12} style={{ color: '#64748b' }} />
                <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  <option value="all">Mọi dòng xe</option>
                  {lineOptions.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label className="select-box" style={{ flex: '1 1 110px', minHeight: '34px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <Filter size={12} style={{ color: '#64748b' }} />
                <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  <option value="all">Mọi phiên bản</option>
                  {versionOptions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="select-box" style={{ flex: '1 1 110px', minHeight: '34px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <Filter size={12} style={{ color: '#64748b' }} />
                <select value={exteriorFilter} onChange={(e) => setExteriorFilter(e.target.value)} style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  <option value="all">Mọi màu sắc</option>
                  {exteriorOptions.map((ext) => (
                    <option key={ext} value={ext}>
                      {ext}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                <span style={{ color: '#2563eb' }}>{visibleItems.length}</span>
                <span style={{ color: '#94a3b8' }}>/</span>
                <span>{items.length} xe</span>
              </div>
              
              {(searchText || statusFilter !== 'all' || lineFilter !== 'all' || versionFilter !== 'all' || exteriorFilter !== 'all') && (
                <button
                  type="button"
                  className="ghost-button"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '4px', 
                    color: '#dc2626', 
                    borderColor: '#fca5a5', 
                    padding: '4px 10px', 
                    height: '28px',
                    borderRadius: '8px', 
                    fontSize: '11.5px', 
                    fontWeight: 600,
                    background: '#fef2f2'
                  }}
                  onClick={() => {
                    setSearchText('');
                    setStatusFilter('all');
                    setLineFilter('all');
                    setVersionFilter('all');
                    setExteriorFilter('all');
                  }}
                  title="Hủy toàn bộ lọc"
                >
                  <RotateCcw size={12} />
                  Xóa
                </button>
              )}
              {canManageInventory ? (
                <button
                  className="primary-button"
                  onClick={onOpenImport}
                  style={{ height: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, gap: '6px', marginLeft: 'auto' }}
                >
                  <PackageCheck size={15} />
                  <span>Nhập kho</span>
                </button>
              ) : null}
            </div>
          )}

          {/* Mobile list view */}
          {isMobile && mobileView === 'list' ? (
            <div className="inventory-mobile-list-shell">
              <div className="inventory-mobile-card-list">
                {visibleItems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    Không có dữ liệu kho xe phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  visibleItems.map((item) => {
                    const isActive = selectedItem?.vin === item.vin;
                    return (
                      <button
                        key={item.vin}
                        type="button"
                        className={isActive ? 'inventory-mobile-card active' : 'inventory-mobile-card'}
                        onClick={() => {
                          setSelectedVin(item.vin);
                          setMobileView('detail');
                          if (item.latitude !== null && item.longitude !== null) {
                            setHighlightedVin(item.vin);
                          }
                        }}
                      >
                        <div className="inventory-mobile-card-header">
                          <div className="inventory-mobile-card-headings">
                            <p className="inventory-mobile-card-title">{item.vin}</p>
                            <p className="inventory-mobile-card-subtitle">{item.line} · {item.version}</p>
                          </div>
                          <span className={stockTone[item.status]}>{item.status}</span>
                        </div>
                        <div className="inventory-mobile-card-divider" />
                        <div className="inventory-mobile-card-body">
                          <div className="inventory-mobile-card-grid">
                            <div>
                              <span>Ngoại thất</span>
                              <strong>{item.exterior || '---'}</strong>
                            </div>
                            <div>
                              <span>Nội thất</span>
                              <strong>{item.interior || '---'}</strong>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {/* Table Block */}
          <div className="table-wrap" style={{ marginTop: '8px' }}>
            <table>
              <thead>
                <tr>
                  <th>VIN</th>
                  <th>Dòng & Phiên bản</th>
                  <th>Ngoại thất</th>
                  <th>Nội thất</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">Không có dữ liệu kho xe phù hợp với bộ lọc hiện tại.</div>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr key={item.vin}>
                      <td 
                        onClick={() => {
                          if (item.latitude !== null && item.longitude !== null) {
                            setHighlightedVin(null);
                            setTimeout(() => setHighlightedVin(item.vin), 50);
                          }
                        }}
                        style={{ 
                          cursor: (item.latitude !== null && item.longitude !== null) ? 'pointer' : 'default',
                          position: 'relative',
                          paddingLeft: (item.latitude !== null && item.longitude !== null) ? '1.2rem' : 'auto',
                          borderLeft: (item.latitude !== null && item.longitude !== null) ? '4px solid #10b981' : 'none'
                        }}
                        title={item.latitude !== null ? "Bấm để xem xe này trên bản đồ" : ""}
                      >
                        <strong style={{ color: (item.latitude !== null) ? '#2563eb' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.vin} 
                          {item.latitude !== null && <LocateFixed size={13} style={{ color: '#10b981' }} />}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ display: 'block', fontSize: '12.5px', color: '#334155' }}>{item.line}</strong>
                        <small style={{ display: 'block', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>{item.version}</small>
                      </td>
                      <td>{item.exterior}</td>
                      <td>{item.interior}</td>
                      <td>
                        <span className={stockTone[item.status]}>{item.status}</span>
                        {item.holdExpiry ? <small>Hạn: {item.holdExpiry}</small> : null}
                      </td>
                      <td>
                        <div className="row-actions">

                          {item.status === 'Đang giữ' && item.holderUsername !== currentUsername && (
                            queuedVins.some((vin) => vin.toUpperCase() === item.vin.toUpperCase()) ? (
                              <button
                                className="row-action-button action-btn-release"
                                disabled={isQueueingVin === item.vin}
                                onClick={() => onLeaveQueue(item.vin)}
                                title="Hủy đăng ký hàng chờ"
                              >
                                <X size={14} />
                                <span>{isQueueingVin === item.vin ? 'Đang hủy...' : 'Hủy chờ'}</span>
                              </button>
                            ) : (
                              <button
                                className="row-action-button action-btn-queue"
                                disabled={isQueueingVin === item.vin}
                                onClick={() => onJoinQueue(item.vin)}
                                title="Đăng ký hàng chờ ưu tiên khi xe được nhả"
                              >
                                <Clock size={14} />
                                <span>{isQueueingVin === item.vin ? 'Đang đăng ký...' : 'Chờ xe'}</span>
                              </button>
                            )
                          )}

                          {item.status === 'Chưa ghép' && (
                            <button
                              className="row-action-button action-btn-hold"
                              disabled={!canHoldVehicle || isHoldingVin === item.vin}
                              onClick={() => onHoldItem(item)}
                              title="Giữ xe tạm thời trong 24h."
                            >
                              <PackageCheck size={14} />
                              <span>{isHoldingVin === item.vin ? 'Đang giữ...' : 'Giữ xe'}</span>
                            </button>
                          )}

                          {(canOverrideHeldVehicle || item.holderUsername === currentUsername) && item.status === 'Đang giữ' && (
                             <button
                               className="row-action-button action-btn-create"
                               onClick={() => onCreateOrderFromItem(item)}
                               title="Tạo đơn hàng mới và ghép luôn VIN đang giữ."
                             >
                               <FilePlus2 size={14} />
                               <span>Tạo đơn</span>
                             </button>
                          )}

                          {(canOverrideHeldVehicle || item.holderUsername === currentUsername) && item.status === 'Đang giữ' && (
                            <button
                              className="row-action-button action-btn-release"
                              disabled={isReleasingVin === item.vin}
                              onClick={() => onReleaseItem(item.vin)}
                              title="Hủy bỏ giữ xe, trả lại kho rảnh."
                            >
                              <X size={14} />
                              <span>{isReleasingVin === item.vin ? 'Đang nhả...' : 'Bỏ giữ'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile detail view */}
        {isMobile && mobileView === 'detail' ? (
          <div className="inventory-mobile-detail-stack">
            {selectedItem ? (
              <div className="inventory-mobile-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="ghost-button inventory-mobile-back"
                  onClick={() => setMobileView('list')}
                >
                  <ArrowLeft size={14} />
                  <span>Danh sách</span>
                </button>

                <div className="inventory-mobile-detail-shell">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div className="clickable-copy-field" title="Click để copy VIN" onClick={() => setHighlightedVin(selectedItem.vin)} style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>Chi tiết kho xe</p>
                      <h3 style={{ margin: '2px 0 0', fontSize: '18px', lineHeight: 1.15, fontWeight: 700, color: '#0f172a' }}>{selectedItem.vin}</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>{selectedItem.line} · {selectedItem.version}</p>
                    </div>
                    <span className={stockTone[selectedItem.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {selectedItem.status}
                    </span>
                  </div>

                  <div className="inventory-mobile-card-divider" />

                  <div className="inventory-mobile-detail-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                      <LocateFixed size={14} />
                      <span>Thông tin kho xe</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Bãi xe</span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>{selectedItem.location || '---'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Người giữ</span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>{selectedItem.holder || '---'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Số máy</span>
                        <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedItem.engineNo || 'Trống'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Hạn giữ</span>
                        <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedItem.holdExpiry || '---'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="inventory-mobile-actions">
                    {selectedItem.status === 'Chưa ghép' && (
                      <button
                        className="primary-button"
                        disabled={!canHoldVehicle || isHoldingVin === selectedItem.vin}
                        onClick={() => onHoldItem(selectedItem)}
                      >
                        <PackageCheck size={14} />
                        <span>{isHoldingVin === selectedItem.vin ? 'Đang giữ...' : 'Giữ xe'}</span>
                      </button>
                    )}

                    {(canOverrideHeldVehicle || selectedItem.holderUsername === currentUsername) && selectedItem.status === 'Đang giữ' && (
                      <button
                        className="ghost-button"
                        onClick={() => onCreateOrderFromItem(selectedItem)}
                      >
                        <FilePlus2 size={14} />
                        <span>Tạo đơn</span>
                      </button>
                    )}

                    {(canOverrideHeldVehicle || selectedItem.holderUsername === currentUsername) && selectedItem.status === 'Đang giữ' && (
                      <button
                        className="ghost-button"
                        disabled={isReleasingVin === selectedItem.vin}
                        onClick={() => onReleaseItem(selectedItem.vin)}
                      >
                        <X size={14} />
                        <span>{isReleasingVin === selectedItem.vin ? 'Đang nhả...' : 'Bỏ giữ'}</span>
                      </button>
                    )}

                    {selectedItem.status === 'Đang giữ' && selectedItem.holderUsername !== currentUsername && (
                      queuedVins.some((vin) => vin.toUpperCase() === selectedItem.vin.toUpperCase()) ? (
                        <button
                          className="ghost-button"
                          disabled={isQueueingVin === selectedItem.vin}
                          onClick={() => onLeaveQueue(selectedItem.vin)}
                        >
                          <X size={14} />
                          <span>{isQueueingVin === selectedItem.vin ? 'Đang hủy...' : 'Hủy chờ'}</span>
                        </button>
                      ) : (
                        <button
                          className="ghost-button"
                          disabled={isQueueingVin === selectedItem.vin}
                          onClick={() => onJoinQueue(selectedItem.vin)}
                        >
                          <Clock size={14} />
                          <span>{isQueueingVin === selectedItem.vin ? 'Đang đăng ký...' : 'Chờ xe'}</span>
                        </button>
                      )
                    )}

                    {selectedItem.latitude !== null && selectedItem.longitude !== null ? (
                      <div className="inventory-mobile-gps-chip">
                        <LocateFixed size={14} />
                        <span>GPS Live</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                Chưa chọn xe kho nào.
              </div>
            )}
          </div>
        ) : null}

        {/* Right Area (Visual & GPS Widget) */}
        <div className="inventory-visual-side">
          <div className="mini-map-widget-container">
            <div className="mini-map-widget-header">
              <h4>
                <LocateFixed size={15} style={{ color: '#10b981' }} />
                Theo dõi GPS Live
              </h4>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px' }}>
                {visibleVehicleLocations.length} Trạm
              </span>
            </div>
            <VehicleLocationMapPanel
              locations={visibleVehicleLocations}
              inventoryItems={visibleItems}
              highlightedVin={highlightedVin}
              isWidget={true}
            />
          </div>

          <div className="visual-side-tip">
            <h5>💡 Thao tác nhanh</h5>
            <p>Bấm vào số VIN của các xe có nhãn "GPS LIVE" màu xanh để bản đồ tự động cuộn và phóng to vị trí bãi đỗ của xe đó.</p>
          </div>
        </div>

      </div>
    </section>
  );
};
