import React from 'react';
import { Calculator, CheckCircle2, ChevronRight, Download, FileText, Printer, RotateCcw, Save, Settings2, Tag, User, Car, FilePlus2 } from 'lucide-react';
import {
  clearPricingDatasetConfig,
  computePricingQuote,
  formatCurrency,
  getAvailablePromotions,
  getDefaultPromotionIds,
  getVersionsForModel,
  savePricingDatasetConfig,
  pricingDataset,
  type PricingDataset,
  type PricingSelection,
  type PricingPromotion
} from '../data/vinfastPricing';

type PricingDraft = PricingDataset;
type AdminFlowPreset = 'standard' | 'showroom' | 'promotion';

const defaultModel = pricingDataset.models[0]?.id || '';
const defaultVersion = getVersionsForModel(defaultModel)[0]?.id || pricingDataset.versions[0]?.id || '';
const defaultCustomerType = pricingDataset.customerTypes[2]?.id || pricingDataset.customerTypes[0]?.id || '';
const defaultVersionColors = pricingDataset.versions.find((version) => version.id === defaultVersion)?.colors || [];

interface PricingPanelProps {
  isAdmin: boolean;
}

export const PricingPanel: React.FC<PricingPanelProps> = ({ isAdmin }) => {
  const quoteRef = React.useRef<HTMLDivElement | null>(null);
  const [pricingDraft, setPricingDraft] = React.useState<PricingDraft>(() => clonePricingDataset(pricingDataset));
  const [advancedJson, setAdvancedJson] = React.useState(() => JSON.stringify(pricingDataset, null, 2));
  const [adminError, setAdminError] = React.useState('');
  const [modelId, setModelId] = React.useState(defaultModel);
  const [versionId, setVersionId] = React.useState(defaultVersion);
  const [colorId, setColorId] = React.useState(defaultVersionColors[0]?.id || '');
  const [customerTypeId, setCustomerTypeId] = React.useState(defaultCustomerType);
  const [vinClubTierId, setVinClubTierId] = React.useState<string | null>(null);
  const [selectedPromotionIds, setSelectedPromotionIds] = React.useState<string[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = React.useState<string[]>([]);
  const [customFeeAmounts, setCustomFeeAmounts] = React.useState<Record<string, number>>({});
  const [selectedOptionalFeeIds, setSelectedOptionalFeeIds] = React.useState<string[]>([]);
  const [customOptionalFeeAmounts, setCustomOptionalFeeAmounts] = React.useState<Record<string, number>>({});
  const [dealerDiscount, setDealerDiscount] = React.useState<number>(0);
  const [region, setRegion] = React.useState<'hnhcm' | 'other'>('hnhcm');
  const [adminTargetModelId, setAdminTargetModelId] = React.useState(defaultModel);
  const [adminTargetVersionId, setAdminTargetVersionId] = React.useState(defaultVersion);
  const [adminTargetCustomerTypeId, setAdminTargetCustomerTypeId] = React.useState(defaultCustomerType);
  const [adminFlowPreset, setAdminFlowPreset] = React.useState<AdminFlowPreset>('standard');
  const [activeAdminTab, setActiveAdminTab] = React.useState<'vehicles' | 'promotions' | 'fees' | 'settings'>('vehicles');
  const [editingPromotionIndex, setEditingPromotionIndex] = React.useState<number | null>(null);
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [consultantName, setConsultantName] = React.useState('');
  const quoteNo = React.useState(() => `BG-${new Date().toISOString().slice(0, 10).split('-').join('')}-${Math.floor(Math.random() * 9000) + 1000}`)[0];
  const quoteDate = React.useState(() =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  )[0];

  React.useEffect(() => {
    setAdvancedJson(JSON.stringify(pricingDraft, null, 2));
  }, [pricingDraft]);

  const selectedModel = React.useMemo(
    () => pricingDraft.models.find((model) => model.id === modelId) || pricingDraft.models[0] || null,
    [modelId, pricingDraft.models]
  );
  const versionOptions = React.useMemo(
    () => pricingDraft.versions.filter((version) => version.modelId === (selectedModel?.id || modelId)),
    [modelId, pricingDraft.versions, selectedModel?.id]
  );
  const selectedVersion = React.useMemo(
    () => versionOptions.find((version) => version.id === versionId) || versionOptions[0] || pricingDraft.versions[0] || null,
    [pricingDraft.versions, versionOptions, versionId]
  );
  const selectedCustomerType = React.useMemo(
    () => pricingDraft.customerTypes.find((customerType) => customerType.id === customerTypeId) || pricingDraft.customerTypes[0] || null,
    [customerTypeId, pricingDraft.customerTypes]
  );
  const adminTargetModel = React.useMemo(
    () => pricingDraft.models.find((model) => model.id === adminTargetModelId) || pricingDraft.models[0] || null,
    [adminTargetModelId, pricingDraft.models]
  );
  const adminTargetVersionOptions = React.useMemo(
    () => pricingDraft.versions.filter((version) => version.modelId === (adminTargetModel?.id || adminTargetModelId)),
    [adminTargetModel?.id, adminTargetModelId, pricingDraft.versions]
  );
  const adminTargetVersion = React.useMemo(
    () =>
      adminTargetVersionOptions.find((version) => version.id === adminTargetVersionId) ||
      adminTargetVersionOptions[0] ||
      pricingDraft.versions[0] ||
      null,
    [adminTargetVersionId, adminTargetVersionOptions, pricingDraft.versions]
  );
  const adminTargetCustomerType = React.useMemo(
    () => pricingDraft.customerTypes.find((customerType) => customerType.id === adminTargetCustomerTypeId) || pricingDraft.customerTypes[0] || null,
    [adminTargetCustomerTypeId, pricingDraft.customerTypes]
  );
  const availablePromotions = React.useMemo(() => {
    if (!selectedVersion || !selectedCustomerType) return [];
    return getAvailablePromotions(selectedVersion, selectedCustomerType);
  }, [selectedVersion, selectedCustomerType]);
  const defaultPromotionIds = React.useMemo(() => {
    if (!selectedVersion || !selectedCustomerType) return [];
    return getDefaultPromotionIds(selectedVersion, selectedCustomerType);
  }, [selectedVersion, selectedCustomerType]);

  React.useEffect(() => {
    if (!selectedModel) return;
    if (selectedVersion && selectedVersion.modelId !== selectedModel.id) {
      const nextVersion = versionOptions[0] || null;
      if (nextVersion) {
        setVersionId(nextVersion.id);
        setColorId(nextVersion.colors[0]?.id || '');
      }
      return;
    }

    if (!versionOptions.some((version) => version.id === versionId)) {
      const nextVersion = versionOptions[0] || null;
      if (nextVersion) {
        setVersionId(nextVersion.id);
        setColorId(nextVersion.colors[0]?.id || '');
      }
    }
  }, [selectedModel, selectedVersion, versionOptions, versionId]);

  React.useEffect(() => {
    if (!selectedVersion) return;
    if (!selectedVersion.colors.some((color) => color.id === colorId)) {
      setColorId(selectedVersion.colors[0]?.id || '');
    }
  }, [selectedVersion, colorId]);

  React.useEffect(() => {
    setSelectedPromotionIds(defaultPromotionIds);
  }, [defaultPromotionIds]);

  React.useEffect(() => {
    if (!selectedCustomerType?.allowsVinclub) {
      setVinClubTierId(null);
    }
  }, [selectedCustomerType]);

  React.useEffect(() => {
    if (!adminTargetModel) return;
    if (adminTargetVersion && adminTargetVersion.modelId !== adminTargetModel.id) {
      const nextVersion = adminTargetVersionOptions[0] || null;
      if (nextVersion) {
        setAdminTargetVersionId(nextVersion.id);
      }
      return;
    }

    if (!adminTargetVersionOptions.some((version) => version.id === adminTargetVersionId)) {
      const nextVersion = adminTargetVersionOptions[0] || null;
      if (nextVersion) {
        setAdminTargetVersionId(nextVersion.id);
      }
    }
  }, [adminTargetModel, adminTargetVersion, adminTargetVersionId, adminTargetVersionOptions]);

  const quote = React.useMemo(() => {
    if (!selectedModel || !selectedVersion || !selectedCustomerType) {
      return null;
    }

    const selection: PricingSelection = {
      modelId: selectedModel.id,
      versionId: selectedVersion.id,
      colorId,
      customerTypeId: selectedCustomerType.id,
      vinClubTierId: selectedCustomerType.allowsVinclub ? vinClubTierId : null,
      region,
      selectedPromotionIds,
      selectedFeeIds,
      customFeeAmounts,
      selectedOptionalFeeIds,
      customOptionalFeeAmounts,
      dealerDiscount
    };

    return computePricingQuote(selection);
  }, [colorId, region, selectedCustomerType, selectedModel, selectedOptionalFeeIds, selectedPromotionIds, selectedVersion, vinClubTierId, customOptionalFeeAmounts, selectedFeeIds, customFeeAmounts, dealerDiscount]);

  const selectedPromotionSet = React.useMemo(() => new Set(selectedPromotionIds), [selectedPromotionIds]);
  const selectedFeeSet = React.useMemo(() => new Set(selectedFeeIds), [selectedFeeIds]);
  const selectedOptionalFeeSet = React.useMemo(() => new Set(selectedOptionalFeeIds), [selectedOptionalFeeIds]);



  function togglePromotion(promotionId: string) {
    if (promotionId === 'p4' && vinClubTierId) {
      setVinClubTierId(null);
    }
    setSelectedPromotionIds((current) =>
      current.includes(promotionId) ? current.filter((item) => item !== promotionId) : [...current, promotionId]
    );
  }

  function toggleFee(feeId: string) {
    setSelectedFeeIds((current) =>
      current.includes(feeId) ? current.filter((item) => item !== feeId) : [...current, feeId]
    );
  }

  function toggleOptionalFee(feeId: string) {
    setSelectedOptionalFeeIds((current) =>
      current.includes(feeId) ? current.filter((item) => item !== feeId) : [...current, feeId]
    );
  }

  function handleModelChange(nextModelId: string) {
    setModelId(nextModelId);
    const nextVersion = pricingDraft.versions.filter((version) => version.modelId === nextModelId)[0] || pricingDraft.versions[0] || null;
    if (nextVersion) {
      setVersionId(nextVersion.id);
      setColorId(nextVersion.colors[0]?.id || '');
    }
  }

  function handleVersionChange(nextVersionId: string) {
    setVersionId(nextVersionId);
    const nextVersion = pricingDraft.versions.find((version) => version.id === nextVersionId) || null;
    if (nextVersion) {
      setColorId(nextVersion.colors[0]?.id || '');
    }
  }

  function handleCustomerTypeChange(nextCustomerTypeId: string) {
    setCustomerTypeId(nextCustomerTypeId);
    const nextCustomerType = pricingDraft.customerTypes.find((customerType) => customerType.id === nextCustomerTypeId) || null;
    if (nextCustomerType && !nextCustomerType.allowsVinclub) {
      setVinClubTierId(null);
    }
  }

  const vinClubBlocked = selectedPromotionSet.has('p4');

  const brochureUrl = quote?.model.brochure_url || '';

  function handlePrintQuote() {
    window.print();
  }

  function handleDownloadQuote() {
    window.print();
  }

  function handleAdminTargetModelChange(nextModelId: string) {
    setAdminTargetModelId(nextModelId);
    const nextVersion = pricingDraft.versions.filter((version) => version.modelId === nextModelId)[0] || pricingDraft.versions[0] || null;
    if (nextVersion) {
      setAdminTargetVersionId(nextVersion.id);
    }
  }

  function applyAdminPreset(nextModelId: string) {
    handleAdminTargetModelChange(nextModelId);
    const nextModel = pricingDraft.models.find((model) => model.id === nextModelId) || pricingDraft.models[0] || null;
    const nextVersion = pricingDraft.versions.filter((version) => version.modelId === nextModelId)[0] || pricingDraft.versions[0] || null;
    const nextCustomerType = pricingDraft.customerTypes[0] || null;

    if (nextModel) {
      setAdminTargetModelId(nextModel.id);
    }
    if (nextVersion) {
      setAdminTargetVersionId(nextVersion.id);
    }
    if (nextCustomerType) {
      setAdminTargetCustomerTypeId(nextCustomerType.id);
    }
  }

  function applyAdminFlowPreset(nextPreset: AdminFlowPreset) {
    setAdminFlowPreset(nextPreset);
    const presetConfig = {
      standard: {
        bannerContent: 'Báo giá tiêu chuẩn',
        guideContent: 'Dùng cho báo giá cơ bản, giữ cấu hình gọn và dễ hiểu.'
      },
      showroom: {
        bannerContent: 'Báo giá showroom',
        guideContent: 'Dùng khi tư vấn tại điểm bán, ưu tiên thông tin rõ ràng và trực quan.'
      },
      promotion: {
        bannerContent: 'Báo giá khuyến mãi',
        guideContent: 'Dùng cho chiến dịch ưu đãi, nhấn mạnh CTKM và giá sau giảm.'
      }
    }[nextPreset];

    updatePricingDraft((draft) => {
      draft.bannerContent = presetConfig.bannerContent;
      draft.guideContent = presetConfig.guideContent;
    });

    if (nextPreset === 'promotion') {
      setAdminTargetCustomerTypeId(pricingDraft.customerTypes[0]?.id || adminTargetCustomerTypeId);
    }
  }

  function updateAdminTargetModel(mutator: (model: PricingDraft['models'][number]) => void) {
    updatePricingDraft((draft) => {
      const index = draft.models.findIndex((model) => model.id === adminTargetModelId);
      if (index >= 0) {
        mutator(draft.models[index]);
      }
    });
  }

  function updateAdminTargetVersion(mutator: (version: PricingDraft['versions'][number]) => void) {
    updatePricingDraft((draft) => {
      const index = draft.versions.findIndex((version) => version.id === adminTargetVersionId);
      if (index >= 0) {
        mutator(draft.versions[index]);
      }
    });
  }

  function addPromotion() {
    const nextId = `promo-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    setAdminTargetVersionId(adminTargetVersion?.id || pricingDraft.versions[0]?.id || '');
    updatePricingDraft((draft) => {
      draft.promotions.push({
        id: nextId,
        name: 'CTKM mới',
        type: 'fixed',
        value: 0,
        useSpecificValue: false,
        incompatibleWith: [],
        applicableTo: adminTargetVersion ? [adminTargetVersion.id] : [],
        calculationBase: 'list_price',
        isFuelSwap: false,
        versionOverrides: {},
        rule_type: 'DISCOUNT',
        deduct_from_invoice: true
      });
    });
  }

  function removePromotion(promotionId: string) {
    updatePricingDraft((draft) => {
      draft.promotions = draft.promotions.filter((promotion) => promotion.id !== promotionId);
      for (const key of Object.keys(draft.customerTypePromos)) {
        draft.customerTypePromos[key] = draft.customerTypePromos[key].filter((item) => item !== promotionId);
      }
    });
  }

  function updatePricingDraft(mutator: (draft: PricingDraft) => void) {
    setAdminError('');
    setPricingDraft((current) => {
      const next = clonePricingDataset(current);
      mutator(next);
      return next;
    });
  }

  function handleSavePricingConfig() {
    setAdminError('');
    try {
      savePricingDatasetConfig(pricingDraft);
      window.location.reload();
    } catch (error: any) {
      setAdminError(error?.message || 'JSON cấu hình không hợp lệ.');
    }
  }

  function handleResetPricingConfig() {
    clearPricingDatasetConfig();
    window.location.reload();
  }

  function handleApplyAdvancedJson() {
    setAdminError('');
    try {
      const parsed = JSON.parse(advancedJson);
      savePricingDatasetConfig(parsed);
      window.location.reload();
    } catch (error: any) {
      setAdminError(error?.message || 'JSON cấu hình nâng cao không hợp lệ.');
    }
  }

  return (
    <div className="pricing-shell">

      {isAdmin ? (
        <details className="pricing-admin-panel">
          <summary>
            <Settings2 size={16} />
            <span>Cấu hình giá cho admin</span>
          </summary>
          <div style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                className={`ghost-button ${activeAdminTab === 'vehicles' ? 'active' : ''}`}
                style={{ borderBottom: activeAdminTab === 'vehicles' ? '2px solid #0f172a' : 'none', borderRadius: 0, paddingBottom: '8px' }}
                onClick={() => setActiveAdminTab('vehicles')}
              >
                Cấu hình Xe
              </button>
              <button
                type="button"
                className={`ghost-button ${activeAdminTab === 'promotions' ? 'active' : ''}`}
                style={{ borderBottom: activeAdminTab === 'promotions' ? '2px solid #0f172a' : 'none', borderRadius: 0, paddingBottom: '8px' }}
                onClick={() => setActiveAdminTab('promotions')}
              >
                Khuyến mãi
              </button>
              <button
                type="button"
                className={`ghost-button ${activeAdminTab === 'fees' ? 'active' : ''}`}
                style={{ borderBottom: activeAdminTab === 'fees' ? '2px solid #0f172a' : 'none', borderRadius: 0, paddingBottom: '8px' }}
                onClick={() => setActiveAdminTab('fees')}
              >
                Phụ phí
              </button>
              <button
                type="button"
                className={`ghost-button ${activeAdminTab === 'settings' ? 'active' : ''}`}
                style={{ borderBottom: activeAdminTab === 'settings' ? '2px solid #0f172a' : 'none', borderRadius: 0, paddingBottom: '8px' }}
                onClick={() => setActiveAdminTab('settings')}
              >
                Cài đặt chung
              </button>
            </div>
            
            <div className="pricing-admin-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="ghost-button" onClick={handleResetPricingConfig}>
                <RotateCcw size={16} />
                <span>Khôi phục mặc định</span>
              </button>
              <button type="button" className="primary-button" onClick={handleSavePricingConfig}>
                <Save size={16} />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>

          {activeAdminTab === 'vehicles' && (
            <section className="pricing-admin-card pricing-admin-card-quick">
              <div className="pricing-admin-card-header">
                <strong>Cấu hình Giá & Thông tin xe</strong>
                <span>Chọn dòng xe để sửa giá cơ bản</span>
              </div>
            <div className="pricing-admin-flow-row">
              <button
                type="button"
                className={adminFlowPreset === 'standard' ? 'ghost-button pricing-admin-flow active' : 'ghost-button pricing-admin-flow'}
                onClick={() => applyAdminFlowPreset('standard')}
              >
                Mẫu chuẩn
              </button>
              <button
                type="button"
                className={adminFlowPreset === 'showroom' ? 'ghost-button pricing-admin-flow active' : 'ghost-button pricing-admin-flow'}
                onClick={() => applyAdminFlowPreset('showroom')}
              >
                Mẫu showroom
              </button>
              <button
                type="button"
                className={adminFlowPreset === 'promotion' ? 'ghost-button pricing-admin-flow active' : 'ghost-button pricing-admin-flow'}
                onClick={() => applyAdminFlowPreset('promotion')}
              >
                Mẫu khuyến mãi
              </button>
            </div>
            <div className="pricing-admin-preset-row">
              {pricingDraft.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={model.id === adminTargetModelId ? 'ghost-button pricing-admin-preset active' : 'ghost-button pricing-admin-preset'}
                  onClick={() => applyAdminPreset(model.id)}
                >
                  {model.name}
                </button>
              ))}
            </div>
            <div className="pricing-admin-quick-grid">
              <label>
                <span>Chọn xe</span>
                <select value={adminTargetModelId} onChange={(event) => handleAdminTargetModelChange(event.target.value)}>
                  {pricingDraft.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Chọn phiên bản</span>
                <select value={adminTargetVersionId} onChange={(event) => setAdminTargetVersionId(event.target.value)}>
                  {adminTargetVersionOptions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nhóm khách</span>
                <select value={adminTargetCustomerTypeId} onChange={(event) => setAdminTargetCustomerTypeId(event.target.value)}>
                  {pricingDraft.customerTypes.map((customerType) => (
                    <option key={customerType.id} value={customerType.id}>
                      {customerType.emoji} {customerType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Giá bán cơ bản</span>
                <input
                  type="number"
                  value={adminTargetVersion?.basePrice ?? 0}
                  onChange={(event) =>
                    updateAdminTargetVersion((version) => {
                      version.basePrice = Number(event.target.value || 0);
                    })
                  }
                />
              </label>
              <label>
                <span>Phụ phí màu đặc biệt</span>
                <input
                  type="number"
                  value={adminTargetVersion?.advancedColorPrice ?? 0}
                  onChange={(event) =>
                    updateAdminTargetVersion((version) => {
                      version.advancedColorPrice = Number(event.target.value || 0);
                    })
                  }
                />
              </label>
              <label>
                <span>Tiền đặt cọc</span>
                <input
                  type="number"
                  value={adminTargetVersion?.depositAmount ?? 0}
                  onChange={(event) =>
                    updateAdminTargetVersion((version) => {
                      version.depositAmount = Number(event.target.value || 0);
                    })
                  }
                />
              </label>
              <label>
                <span>Bảo hiểm</span>
                <input
                  type="number"
                  value={adminTargetVersion?.bodyInsuranceAmount ?? 0}
                  onChange={(event) =>
                    updateAdminTargetVersion((version) => {
                      version.bodyInsuranceAmount = Number(event.target.value || 0);
                    })
                  }
                />
              </label>
              <label>
                <span>Tên xe hiển thị</span>
                <input
                  value={adminTargetModel?.name || ''}
                  onChange={(event) =>
                    updateAdminTargetModel((model) => {
                      model.name = event.target.value;
                    })
                  }
                />
              </label>
              <label>
                <span>Link ảnh xe</span>
                <input
                  value={adminTargetModel?.image || ''}
                  onChange={(event) =>
                    updateAdminTargetModel((model) => {
                      model.image = event.target.value;
                    })
                  }
                />
              </label>
              <label>
                <span>Thông điệp ngắn</span>
                <input
                  value={pricingDraft.bannerContent}
                  onChange={(event) =>
                    updatePricingDraft((draft) => {
                      draft.bannerContent = event.target.value;
                    })
                  }
                />
              </label>
            </div>
          </section>
          )}

          {activeAdminTab === 'promotions' && (
            <section className="pricing-admin-card pricing-admin-card-quick">
              <div className="pricing-admin-card-header">
                <strong>Khuyến mãi</strong>
                <div className="pricing-admin-inline-actions">
                  <span>{pricingDraft.promotions.length} CTKM</span>
                  <button type="button" className="primary-button pricing-admin-mini-button" onClick={() => { addPromotion(); setEditingPromotionIndex(pricingDraft.promotions.length); }}>
                    Thêm CTKM
                  </button>
                </div>
              </div>
              <p className="pricing-admin-help">Quản lý các chương trình khuyến mãi. Bấm Sửa để chỉnh cấu hình chi tiết.</p>
              
              <div className="pricing-admin-stack" style={{ marginTop: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 8px' }}>Mã / Tên CTKM</th>
                      <th style={{ padding: '12px 8px' }}>Loại</th>
                      <th style={{ padding: '12px 8px' }}>Mức giảm</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingDraft.promotions.map((promotion, index) => (
                      <tr key={promotion.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>{promotion.id}</strong>
                          <span style={{ color: '#475569' }}>{promotion.name}</span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#475569' }}>
                          {promotion.rule_type === 'DISCOUNT' ? 'Giảm giá' : 'Phụ phí'}
                          <br/>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {promotion.deduct_from_invoice !== false ? '(Vào HĐ)' : '(Ngoài HĐ)'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 500 }}>
                          {promotion.type === 'percentage' ? `${promotion.value}%` : formatCurrency(promotion.value)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <button type="button" className="ghost-button" style={{ padding: '6px 12px', marginRight: '8px' }} onClick={() => setEditingPromotionIndex(index)}>
                            Sửa
                          </button>
                          <button type="button" className="ghost-button" style={{ color: '#ef4444', padding: '6px 12px' }} onClick={() => removePromotion(promotion.id)}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="pricing-admin-settings-container">
            {activeAdminTab === 'settings' && (
              <div className="pricing-admin-grid">
                <section className="pricing-admin-card pricing-admin-card-wide">
                  <div className="pricing-admin-card-header">
                    <strong>Thông tin hiển thị</strong>
                    <span>Banner và ghi chú</span>
                  </div>
                  <div className="pricing-admin-fields">
                    <label>
                      <span>Banner nội dung</span>
                      <textarea
                        value={pricingDraft.bannerContent}
                        onChange={(event) =>
                          updatePricingDraft((draft) => {
                            draft.bannerContent = event.target.value;
                          })
                        }
                        placeholder="Nội dung banner ngắn cho tab tính giá"
                      />
                    </label>
                    <label>
                      <span>Ghi chú nội bộ</span>
                      <textarea
                        value={pricingDraft.guideContent}
                        onChange={(event) =>
                          updatePricingDraft((draft) => {
                            draft.guideContent = event.target.value;
                          })
                        }
                        placeholder="Lưu ý nội bộ cho người sử dụng"
                      />
                    </label>
                  </div>
                </section>

                <section className="pricing-admin-card">
                  <div className="pricing-admin-card-header">
                    <strong>Dòng xe</strong>
                    <span>{pricingDraft.models.length} mẫu</span>
                  </div>
                  <div className="pricing-admin-stack">
                    {pricingDraft.models.map((model, index) => (
                      <div key={model.id || index} className="pricing-admin-row">
                        <span className="pricing-admin-id">{model.id}</span>
                        <label>
                          <span>Tên hiển thị</span>
                          <input
                            value={model.name}
                            onChange={(event) =>
                              updatePricingDraft((draft) => {
                                draft.models[index].name = event.target.value;
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Ảnh</span>
                          <input
                            value={model.image}
                            onChange={(event) =>
                              updatePricingDraft((draft) => {
                                draft.models[index].image = event.target.value;
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Brochure</span>
                          <input
                            value={model.brochure_url}
                            onChange={(event) =>
                              updatePricingDraft((draft) => {
                                draft.models[index].brochure_url = event.target.value;
                              })
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
            
            {activeAdminTab === 'fees' && (
              <div className="pricing-admin-grid">

              <section className="pricing-admin-card">
                <div className="pricing-admin-card-header">
                  <strong>Phí bắt buộc</strong>
                  <span>{pricingDraft.fees.length} dòng</span>
                </div>
                <div className="pricing-admin-stack">
                  {pricingDraft.fees.map((fee, index) => (
                    <div key={fee.id || index} className="pricing-admin-row">
                      <span className="pricing-admin-id">{fee.id}</span>
                      <label>
                        <span>Tên phí</span>
                        <input
                          value={fee.name}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.fees[index].name = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>HN / HCM</span>
                        <input
                          type="number"
                          value={fee.amountHnHcm}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.fees[index].amountHnHcm = Number(event.target.value || 0);
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Khu vực khác</span>
                        <input
                          type="number"
                          value={fee.amountOther}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.fees[index].amountOther = Number(event.target.value || 0);
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>


              <section className="pricing-admin-card">
                <div className="pricing-admin-card-header">
                  <strong>Phí tùy chọn</strong>
                  <span>{pricingDraft.optionalFees.length} dòng</span>
                </div>
                <div className="pricing-admin-stack">
                  {pricingDraft.optionalFees.map((fee, index) => (
                    <div key={fee.id || index} className="pricing-admin-row">
                      <span className="pricing-admin-id">{fee.id}</span>
                      <label>
                        <span>Tên</span>
                        <input
                          value={fee.name}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.optionalFees[index].name = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Giá trị</span>
                        <input
                          type="number"
                          value={fee.defaultAmount}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.optionalFees[index].defaultAmount = Number(event.target.value || 0);
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeAdminTab === 'settings' && (
            <div className="pricing-admin-grid">
              <section className="pricing-admin-card">
                <div className="pricing-admin-card-header">
                  <strong>Nhóm khách hàng</strong>
                  <span>{pricingDraft.customerTypes.length} nhóm</span>
                </div>
                <div className="pricing-admin-stack">
                  {pricingDraft.customerTypes.map((customerType, index) => (
                    <div key={customerType.id || index} className="pricing-admin-row">
                      <span className="pricing-admin-id">{customerType.id}</span>
                      <label>
                        <span>Tên nhóm</span>
                        <input
                          value={customerType.name}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypes[index].name = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Biểu tượng</span>
                        <input
                          value={customerType.emoji}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypes[index].emoji = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Mô tả</span>
                        <input
                          value={customerType.description}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypes[index].description = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label className="pricing-admin-toggle">
                        <input
                          type="checkbox"
                          checked={customerType.allowsDeposit}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypes[index].allowsDeposit = event.target.checked;
                            })
                          }
                        />
                        <span>Cho phép đặt cọc</span>
                      </label>
                      <label className="pricing-admin-toggle">
                        <input
                          type="checkbox"
                          checked={customerType.allowsVinclub}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypes[index].allowsVinclub = event.target.checked;
                            })
                          }
                        />
                        <span>Cho phép VinClub</span>
                      </label>
                      <label>
                        <span>CTKM mặc định</span>
                        <input
                          value={pricingDraft.customerTypePromos[customerType.id]?.join(', ') || ''}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.customerTypePromos[customerType.id] = parseCsvList(event.target.value);
                            })
                          }
                          placeholder="Ví dụ: p1, p3"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pricing-admin-card">
                <div className="pricing-admin-card-header">
                  <strong>VinClub</strong>
                  <span>{pricingDraft.vinClubTiers.length} hạng</span>
                </div>
                <div className="pricing-admin-stack">
                  {pricingDraft.vinClubTiers.map((tier, index) => (
                    <div key={tier.id || index} className="pricing-admin-row">
                      <span className="pricing-admin-id">{tier.id}</span>
                      <label>
                        <span>Tên hạng</span>
                        <input
                          value={tier.name}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.vinClubTiers[index].name = event.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Giảm %</span>
                        <input
                          type="number"
                          value={tier.discountPercentage}
                          onChange={(event) =>
                            updatePricingDraft((draft) => {
                              draft.vinClubTiers[index].discountPercentage = Number(event.target.value || 0);
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}

          {activeAdminTab === 'settings' && (
            <div className="pricing-admin-grid" style={{ marginTop: '24px' }}>
              <section className="pricing-admin-card pricing-admin-card-wide">
                <div className="pricing-admin-card-header">
                  <strong>JSON nâng cao</strong>
                  <span>Chỉ dùng khi cần import nhanh hoặc sửa trường chưa có trên màn hình.</span>
                </div>
                <textarea
                  className="pricing-admin-editor"
                  value={advancedJson}
                  onChange={(event) => setAdvancedJson(event.target.value)}
                  spellCheck={false}
                  style={{ width: '100%', minHeight: '200px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}
                />
                <div className="pricing-admin-actions" style={{ marginTop: '12px' }}>
                  <button type="button" className="ghost-button" onClick={() => setAdvancedJson(JSON.stringify(pricingDraft, null, 2))}>
                    <span>Nạp từ form</span>
                  </button>
                  <button type="button" className="primary-button" onClick={handleApplyAdvancedJson}>
                    <Save size={16} />
                    <span>Áp dụng JSON</span>
                  </button>
                </div>
              </section>
            </div>
          )}
          </div>
          {editingPromotionIndex !== null && pricingDraft.promotions[editingPromotionIndex] && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Chỉnh sửa Khuyến Mãi</h3>
                <div className="pricing-admin-quick-grid">
                  <label>
                    <span>Mã CTKM</span>
                    <input disabled value={pricingDraft.promotions[editingPromotionIndex].id} style={{ background: '#f8fafc' }} />
                  </label>
                  <label>
                    <span>Tên CTKM</span>
                    <input
                      value={pricingDraft.promotions[editingPromotionIndex].name}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].name = e.target.value; })}
                    />
                  </label>
                  <label>
                    <span>Loại tác động</span>
                    <select
                      value={pricingDraft.promotions[editingPromotionIndex].rule_type || 'DISCOUNT'}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].rule_type = e.target.value as PricingPromotion['rule_type']; })}
                    >
                      <option value="DISCOUNT">Khấu trừ / Giảm giá</option>
                      <option value="SURCHARGE">Phụ phí cộng thêm</option>
                    </select>
                  </label>
                  <label>
                    <span>Kiểu khấu trừ</span>
                    <select
                      value={pricingDraft.promotions[editingPromotionIndex].deduct_from_invoice !== false ? 'true' : 'false'}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].deduct_from_invoice = e.target.value === 'true'; })}
                    >
                      <option value="true">Tính vào Giá Hóa Đơn</option>
                      <option value="false">Tính vào Giá Thu Thực Tế (Không ra HĐ)</option>
                    </select>
                  </label>
                  <label>
                    <span>Cơ chế giảm</span>
                    <select
                      value={pricingDraft.promotions[editingPromotionIndex].type}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].type = e.target.value as PricingPromotion['type']; })}
                    >
                      <option value="fixed">Số tiền</option>
                      <option value="percentage">Phần trăm</option>
                    </select>
                  </label>
                  <label>
                    <span>Mức giảm</span>
                    <input
                      type="number"
                      value={pricingDraft.promotions[editingPromotionIndex].value}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].value = Number(e.target.value || 0); })}
                    />
                  </label>
                  <label>
                    <span>Áp dụng cho xe</span>
                    <input
                      value={pricingDraft.promotions[editingPromotionIndex].applicableTo.join(', ')}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].applicableTo = parseCsvList(e.target.value); })}
                      placeholder="Ví dụ: vf3-standard, vf3-plus"
                    />
                  </label>
                  <label>
                    <span>Không dùng chung với</span>
                    <input
                      value={pricingDraft.promotions[editingPromotionIndex].incompatibleWith.join(', ')}
                      onChange={(e) => updatePricingDraft(draft => { draft.promotions[editingPromotionIndex].incompatibleWith = parseCsvList(e.target.value); })}
                      placeholder="Ví dụ: p1, p2"
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                  <button type="button" className="primary-button" onClick={() => setEditingPromotionIndex(null)}>Xong</button>
                </div>
              </div>
            </div>
          )}

          {adminError ? <div className="pricing-admin-error">{adminError}</div> : null}
        </details>
      ) : null}
      <div className="pricing-modern-workspace">
        {/* LEFT COLUMN: Configuration */}
        <div className="pricing-config-side custom-scrollbar">
          
          <div className="pricing-hero-header">
            <div>
              <h2>Tính Giá Chi Tiết</h2>
              <p>Chọn các cấu hình, ưu đãi và dịch vụ bên dưới. Bảng báo giá sẽ tự động tính toán bên phải.</p>
            </div>
            <div className="pricing-hero-actions">
              <button className="ghost-button" type="button" onClick={handlePrintQuote}>
                <Printer size={17} />
                <span>In báo giá</span>
              </button>
              <button className="ghost-button" type="button" onClick={handleDownloadQuote}>
                <Download size={17} />
                <span>Tải PDF</span>
              </button>
              {brochureUrl ? (
                <a className="ghost-button" href={brochureUrl} target="_blank" rel="noreferrer">
                  <FileText size={17} />
                  <span>Xem brochure</span>
                </a>
              ) : null}
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <User size={16} />
              <span>Thông tin Khách hàng</span>
            </div>
            <div className="pricing-section-content pricing-grid-3">
              <div className="pricing-input-group">
                <label>Tên khách hàng</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nhập tên" />
              </div>
              <div className="pricing-input-group">
                <label>Số điện thoại</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Nhập SĐT" />
              </div>
              <div className="pricing-input-group">
                <label>Tư vấn viên</label>
                <input value={consultantName} onChange={(e) => setConsultantName(e.target.value)} placeholder="Tên TVBH" />
              </div>
              <div className="pricing-input-group">
                <label>Nhóm khách hàng</label>
                <select value={customerTypeId} onChange={(e) => handleCustomerTypeChange(e.target.value)}>
                  {pricingDraft.customerTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
              </div>
              <div className="pricing-input-group">
                <label>VinClub</label>
                <select value={vinClubTierId || ''} onChange={(e) => setVinClubTierId(e.target.value || null)} disabled={!selectedCustomerType?.allowsVinclub || vinClubBlocked}>
                  <option value="">Không áp dụng</option>
                  {pricingDraft.vinClubTiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} - {t.discountPercentage}%</option>
                  ))}
                </select>
              </div>
              <div className="pricing-input-group">
                <label>Khu vực phí</label>
                <select value={region} onChange={(e) => setRegion(e.target.value as 'hnhcm' | 'other')}>
                  <option value="hnhcm">Hà Nội / TP.HCM</option>
                  <option value="other">Đồng Nai / Tỉnh khác</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <Car size={16} />
              <span>Cấu hình Xe</span>
            </div>
            <div className="pricing-section-content">
              <div className="pricing-grid-2">
                <div className="pricing-input-group">
                  <label>Dòng xe</label>
                  <select value={modelId} onChange={(e) => handleModelChange(e.target.value)}>
                    {pricingDraft.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pricing-input-group">
                  <label>Phiên bản</label>
                  <select value={versionId} onChange={(e) => handleVersionChange(e.target.value)}>
                    {versionOptions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pricing-input-group" style={{ marginTop: '8px' }}>
                <label>Màu sắc ({selectedVersion?.colors.find(c => c.id === colorId)?.name || 'Chưa chọn'})</label>
                <div className="pricing-color-swatches">
                  {selectedVersion?.colors.map((color) => (
                    <div
                      key={color.id}
                      className={`color-swatch ${colorId === color.id ? 'active' : ''}`}
                      style={{ background: getSwatchBackground(color.color_code, color.name) }}
                      title={color.name}
                      onClick={() => setColorId(color.id)}
                    >
                      {colorId === color.id && <CheckCircle2 size={16} color={color.color_code === '#FFFFFF' ? '#000' : '#FFF'} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <Tag size={16} />
              <span>Chương trình Khuyến mãi</span>
            </div>
            <div className="pricing-section-content">
              {availablePromotions.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b' }}>Không có CTKM nào cho phiên bản này.</div>
              ) : (
                <div className="pricing-grid-2">
                  {availablePromotions.map((promo) => {
                    const selected = selectedPromotionSet.has(promo.id);
                    return (
                      <div key={promo.id} className={`pricing-toggle-item ${selected ? 'active' : ''}`} onClick={() => togglePromotion(promo.id)}>
                        <div className="pricing-toggle-info">
                          <strong>{promo.name}</strong>
                          <span>{describePromotion(promo, quote?.basePrice || 0)}</span>
                        </div>
                        <div className="pricing-toggle-switch"></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <Tag size={16} />
              <span>Ưu đãi Nhà phân phối & Đại lý</span>
            </div>
            <div className="pricing-section-content">
              <div style={{ padding: '0 4px' }}>
                <input 
                  type="number" 
                  placeholder="Nhập số tiền giảm giá ngoài (đ)"
                  style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                  value={dealerDiscount || ''}
                  onChange={(e) => setDealerDiscount(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <FilePlus2 size={16} />
              <span>Phí Bắt Buộc (Lăn Bánh)</span>
            </div>
            <div className="pricing-section-content">
               {pricingDraft.fees.length === 0 ? (
                 <div style={{ fontSize: '13px', color: '#64748b' }}>Không có phí lăn bánh nào.</div>
               ) : (
                <div className="pricing-grid-2">
                  {pricingDraft.fees.map((fee) => {
                    const selected = selectedFeeSet.has(fee.id);
                    const defaultAmount = region === 'hnhcm' ? fee.amountHnHcm : fee.amountOther;
                    return (
                      <div key={fee.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={`pricing-toggle-item ${selected ? 'active' : ''}`} onClick={() => toggleFee(fee.id)}>
                          <div className="pricing-toggle-info">
                            <strong>{fee.name}</strong>
                            <span>Mặc định: {formatCurrency(defaultAmount)}</span>
                          </div>
                          <div className="pricing-toggle-switch"></div>
                        </div>
                        {selected && (
                          <div style={{ padding: '0 4px' }}>
                            <input 
                              type="number" 
                              placeholder={`Nhập số (Mặc định: ${defaultAmount})`}
                              style={{ width: '100%', height: '36px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                              value={customFeeAmounts[fee.id] !== undefined ? customFeeAmounts[fee.id] : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                setCustomFeeAmounts(prev => {
                                  const next = { ...prev };
                                  if (val === undefined) delete next[fee.id];
                                  else next[fee.id] = val;
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
               )}
            </div>
          </div>

          <div className="pricing-section-card">
            <div className="pricing-section-title">
              <FilePlus2 size={16} />
              <span>Phí Tùy chọn</span>
            </div>
            <div className="pricing-section-content">
               {pricingDraft.optionalFees.length === 0 ? (
                 <div style={{ fontSize: '13px', color: '#64748b' }}>Không có phí tùy chọn nào.</div>
               ) : (
                <div className="pricing-grid-2">
                  {pricingDraft.optionalFees.map((fee) => {
                    const selected = selectedOptionalFeeSet.has(fee.id);
                    return (
                      <div key={fee.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={`pricing-toggle-item ${selected ? 'active' : ''}`} onClick={() => toggleOptionalFee(fee.id)}>
                          <div className="pricing-toggle-info">
                            <strong>{fee.name}</strong>
                            <span>Nhập số tiền tùy chọn</span>
                          </div>
                          <div className="pricing-toggle-switch"></div>
                        </div>
                        {selected && (
                          <div style={{ padding: '0 4px' }}>
                            <input 
                              type="number" 
                              placeholder="Nhập số tiền thực tế (đ)"
                              style={{ width: '100%', height: '36px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                              value={customOptionalFeeAmounts[fee.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setCustomOptionalFeeAmounts(prev => ({ ...prev, [fee.id]: val }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
               )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Result */}
        <div className="pricing-result-side">
          <div className="pricing-result-card" ref={quoteRef}>
            <div className="pricing-result-header">
              {quote?.model ? (
                <img src={quote?.color?.image || quote.model.image} alt={quote.model.name} />
              ) : null}
              <h3>{quote?.model.name || 'Chưa chọn xe'}</h3>
              <p>{quote?.version.name || '--'} · {quote?.color?.name || '--'}</p>
              <div style={{ marginTop: '12px', display: 'inline-block', padding: '4px 12px', background: '#e2e8f0', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                Báo giá: {quoteNo}
              </div>
            </div>

            <div className="pricing-result-body custom-scrollbar">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Giá xe</span>
                <div className="pricing-receipt-line">
                  <span>Giá niêm yết</span>
                  <strong>{quote ? formatCurrency(quote.basePrice) : '--'}</strong>
                </div>
                {quote && quote.colorSurcharge > 0 && (
                  <div className="pricing-receipt-line fee" style={{ marginTop: '8px' }}>
                    <span>Phụ phí màu nâng cao ({quote.color?.name})</span>
                    <strong>{formatCurrency(quote.colorSurcharge)}</strong>
                  </div>
                )}
              </div>

              {quote && quote.promotionDiscountTotal + quote.vinClubDiscount > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' }}>Khuyến mãi & Ưu đãi</span>
                  {quote.selectedPromotions.map((promo) => {
                    const sign = promo.rule_type === 'SURCHARGE' ? '+' : '-';
                    const color = promo.rule_type === 'SURCHARGE' ? '#ef4444' : 'inherit';
                    return (
                      <div key={promo.id} className="pricing-receipt-line discount">
                        <span>{promo.name}</span>
                        <strong style={{ color }}>{sign}{formatCurrency(quote.promotionAmounts[promo.id])}</strong>
                      </div>
                    );
                  })}
                  {quote.vinClubDiscount > 0 && (
                    <div className="pricing-receipt-line discount">
                      <span>Chiết khấu VinClub</span>
                      <strong>-{formatCurrency(quote.vinClubDiscount)}</strong>
                    </div>
                  )}
                  {quote.dealerDiscount > 0 && (
                    <div className="pricing-receipt-line discount">
                      <span>Ưu đãi NPP & Đại lý</span>
                      <strong style={{ color: 'inherit' }}>-{formatCurrency(quote.dealerDiscount)}</strong>
                    </div>
                  )}
                </div>
              )}

              {quote && quote.feeTotal > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase' }}>Phí bắt buộc (Lăn bánh)</span>
                  {pricingDraft.fees.map((fee) => {
                    if (!selectedFeeSet.has(fee.id)) return null;
                    return (
                      <div key={fee.id} className="pricing-receipt-line fee">
                        <span>{fee.name}</span>
                        <strong>{formatCurrency(quote.feeAmounts[fee.id] ?? 0)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {quote && quote.optionalFeeTotal > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase' }}>Dịch vụ tùy chọn</span>
                  {pricingDraft.optionalFees.map((fee) => {
                    if (!selectedOptionalFeeSet.has(fee.id)) return null;
                    return (
                      <div key={fee.id} className="pricing-receipt-line">
                        <span>{fee.name}</span>
                        <strong>{formatCurrency(quote.optionalFeeAmounts[fee.id] ?? 0)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pricing-result-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Giá Xuất Hóa Đơn</span>
                <strong style={{ fontSize: '16px', color: '#f8fafc' }}>{quote ? formatCurrency(quote.invoicePrice) : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                <span style={{ color: '#38bdf8' }}>GIÁ THU THỰC TẾ</span>
                <strong style={{ fontSize: '20px', color: '#38bdf8' }}>{quote ? formatCurrency(quote.collectionPrice) : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                <span>Khách hàng: {customerName || 'N/A'}</span>
                <span>Tư vấn: {consultantName || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getSwatchBackground = (colorCode: string, name: string) => {
  const code = colorCode.toUpperCase();
  const lowerName = name.toLowerCase();
  
  if (code.includes('181Y')) return 'linear-gradient(135deg, #87CEEB 50%, #f8fafc 50%)';
  if (code.includes('181U')) return 'linear-gradient(135deg, #FCD34D 50%, #f8fafc 50%)';
  if (code.includes('1821')) return 'linear-gradient(135deg, #F472B6 50%, #f8fafc 50%)';
  if (code.includes('111U')) return 'linear-gradient(135deg, #FCD34D 50%, #1e293b 50%)';

  if (code === 'CE18') return '#f8fafc'; // Blanc
  if (code === 'CE1V') return '#64748b'; // Zenith Grey
  if (code === 'CE2Q') return '#b91c1c'; // Solar Ruby
  if (code === 'CE1W') return '#6ee7b7'; // Urban Mint
  if (code === 'CE11') return '#1e293b'; // Jet Black
  if (code === 'CE17') return '#cbd5e1'; // Desat Silver
  if (code === 'CE2K') return '#fda4af'; // Rose Metallic
  if (code === 'CE2I') return '#34d399'; // Tropical Jade
  if (code === 'CE2J') return '#1e3a8a'; // Moonlit Ocean
  if (code === 'CE2N') return '#5c4033'; // Introspective Brown

  if (lowerName.includes('white') || lowerName.includes('blanc')) return '#f8fafc';
  if (lowerName.includes('black')) return '#1e293b';
  if (lowerName.includes('grey') || lowerName.includes('gray')) return '#64748b';
  if (lowerName.includes('red') || lowerName.includes('ruby')) return '#b91c1c';
  if (lowerName.includes('blue') || lowerName.includes('ocean')) return '#1e3a8a';
  if (lowerName.includes('green') || lowerName.includes('mint') || lowerName.includes('jade')) return '#10b981';
  if (lowerName.includes('yellow')) return '#facc15';
  if (lowerName.includes('pink') || lowerName.includes('rose')) return '#f472b6';
  if (lowerName.includes('silver')) return '#cbd5e1';
  if (lowerName.includes('brown')) return '#5c4033';

  return '#e2e8f0';
};

function describePromotion(promotion: PricingPromotion, basePrice: number) {
  if (promotion.type === 'percentage') {
    return `Giảm ${promotion.value}% trên ${promotion.calculationBase === 'discounted_price' ? 'giá sau ưu đãi' : 'giá niêm yết'}${basePrice ? '' : ''}`;
  }

  const overrideAmount = promotion.versionOverrides ? Object.values(promotion.versionOverrides)[0] : 0;
  const amount = overrideAmount || promotion.value;
  return `Ước tính ${formatCurrency(amount)}`;
}

function Stat({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="pricing-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="pricing-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function clonePricingDataset(dataset: PricingDraft): PricingDraft {
  return JSON.parse(JSON.stringify(dataset));
}

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
