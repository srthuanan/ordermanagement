import React from 'react';
import { Calculator, CheckCircle2, ChevronRight, Download, FileText, Printer, RotateCcw, Save, Settings2, Tag } from 'lucide-react';
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
  const [selectedOptionalFeeIds, setSelectedOptionalFeeIds] = React.useState<string[]>([]);
  const [region, setRegion] = React.useState<'hnhcm' | 'other'>('hnhcm');
  const [adminTargetModelId, setAdminTargetModelId] = React.useState(defaultModel);
  const [adminTargetVersionId, setAdminTargetVersionId] = React.useState(defaultVersion);
  const [adminTargetCustomerTypeId, setAdminTargetCustomerTypeId] = React.useState(defaultCustomerType);
  const [adminFlowPreset, setAdminFlowPreset] = React.useState<AdminFlowPreset>('standard');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [consultantName, setConsultantName] = React.useState('');
  const quoteNo = React.useState(() => `BG-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(Math.random() * 9000) + 1000}`)[0];
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
      selectedOptionalFeeIds
    };

    return computePricingQuote(selection);
  }, [colorId, region, selectedCustomerType, selectedModel, selectedOptionalFeeIds, selectedPromotionIds, selectedVersion, vinClubTierId]);

  const selectedPromotionSet = React.useMemo(() => new Set(selectedPromotionIds), [selectedPromotionIds]);
  const selectedOptionalFeeSet = React.useMemo(() => new Set(selectedOptionalFeeIds), [selectedOptionalFeeIds]);

  function togglePromotion(promotionId: string) {
    if (promotionId === 'p4' && vinClubTierId) {
      setVinClubTierId(null);
    }
    setSelectedPromotionIds((current) =>
      current.includes(promotionId) ? current.filter((item) => item !== promotionId) : [...current, promotionId]
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
        versionOverrides: {}
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
          <p className="pricing-admin-hint">
            Màn hình này được chia theo bước. Chỉ cần làm phần nhanh trước, các mục còn lại để dưới phần chi tiết.
          </p>
          <div className="pricing-admin-actions">
            <button type="button" className="ghost-button" onClick={handleResetPricingConfig}>
              <RotateCcw size={16} />
              <span>Khôi phục mặc định</span>
            </button>
            <button type="button" className="primary-button" onClick={handleSavePricingConfig}>
              <Save size={16} />
              <span>Lưu cấu hình</span>
            </button>
          </div>

          <section className="pricing-admin-card pricing-admin-card-quick">
            <div className="pricing-admin-card-header">
              <strong>Bước 1 — Chỉnh giá chính</strong>
              <span>Phần hay dùng nhất</span>
            </div>
            <p className="pricing-admin-help">Chọn đúng xe rồi nhập giá. Đây là phần người dùng không rành kỹ thuật vẫn có thể làm được.</p>
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

          <section className="pricing-admin-card pricing-admin-card-quick">
            <div className="pricing-admin-card-header">
              <strong>Bước 2 — Khuyến mãi</strong>
              <div className="pricing-admin-inline-actions">
                <span>{pricingDraft.promotions.length} CTKM</span>
                <button type="button" className="ghost-button pricing-admin-mini-button" onClick={addPromotion}>
                  Thêm CTKM
                </button>
              </div>
            </div>
            <p className="pricing-admin-help">Mỗi CTKM là một dòng. Bạn có thể sửa trực tiếp hoặc xóa nếu không dùng.</p>
            <div className="pricing-admin-stack">
              {pricingDraft.promotions.map((promotion, index) => (
                <div key={promotion.id || index} className="pricing-admin-row pricing-admin-promo-row">
                  <span className="pricing-admin-id">{promotion.id}</span>
                  <label>
                    <span>Tên CTKM</span>
                    <input
                      value={promotion.name}
                      onChange={(event) =>
                        updatePricingDraft((draft) => {
                          draft.promotions[index].name = event.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Loại giảm</span>
                    <select
                      value={promotion.type}
                      onChange={(event) =>
                        updatePricingDraft((draft) => {
                          draft.promotions[index].type = event.target.value as PricingPromotion['type'];
                        })
                      }
                    >
                      <option value="fixed">Số tiền</option>
                      <option value="percentage">Phần trăm</option>
                    </select>
                  </label>
                  <label>
                    <span>Mức giảm</span>
                    <input
                      type="number"
                      value={promotion.value}
                      onChange={(event) =>
                        updatePricingDraft((draft) => {
                          draft.promotions[index].value = Number(event.target.value || 0);
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Áp dụng cho xe</span>
                    <input
                      value={promotion.applicableTo.join(', ')}
                      onChange={(event) =>
                        updatePricingDraft((draft) => {
                          draft.promotions[index].applicableTo = parseCsvList(event.target.value);
                        })
                      }
                      placeholder="Ví dụ: vf3-standard, vf3-plus"
                    />
                  </label>
                  <label>
                    <span>Không dùng chung với</span>
                    <input
                      value={promotion.incompatibleWith.join(', ')}
                      onChange={(event) =>
                        updatePricingDraft((draft) => {
                          draft.promotions[index].incompatibleWith = parseCsvList(event.target.value);
                        })
                      }
                      placeholder="Ví dụ: p1, p2"
                    />
                  </label>
                  <div className="pricing-admin-row-actions">
                    <button type="button" className="ghost-button pricing-admin-mini-button" onClick={() => removePromotion(promotion.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <details className="pricing-admin-advanced">
            <summary>Cấu hình chi tiết</summary>
            <p className="pricing-admin-hint">
              Chỉ mở phần này khi cần chỉnh dữ liệu nền như phí, nhóm khách, VinClub hoặc ghi chú nội bộ.
            </p>
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

            <details className="pricing-admin-advanced">
              <summary>JSON nâng cao</summary>
              <p className="pricing-admin-hint">
                Chỉ dùng khi cần import nhanh hoặc sửa một trường chưa có trên màn hình.
              </p>
              <textarea
                className="pricing-admin-editor"
                value={advancedJson}
                onChange={(event) => setAdvancedJson(event.target.value)}
                spellCheck={false}
              />
              <div className="pricing-admin-actions">
                <button type="button" className="ghost-button" onClick={() => setAdvancedJson(JSON.stringify(pricingDraft, null, 2))}>
                  <span>Nạp từ form</span>
                </button>
                <button type="button" className="primary-button" onClick={handleApplyAdvancedJson}>
                  <Save size={16} />
                  <span>Áp dụng JSON</span>
                </button>
              </div>
            </details>
          </details>

          {adminError ? <div className="pricing-admin-error">{adminError}</div> : null}
        </details>
      ) : null}
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="eyebrow">Công cụ tính giá</p>
          <h2>Ước tính giá xe theo dữ liệu cấu hình VinFast</h2>
          <p>
            Chọn dòng xe, phiên bản, màu, nhóm khách hàng và các ưu đãi để hệ thống tự cộng trừ các khoản chi phí.
          </p>
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

        <div className="pricing-hero-card">
          {quote?.model ? (
            <img className="pricing-hero-image" src={quote.model.image} alt={quote.model.name} />
          ) : null}
          <div className="pricing-hero-summary">
            <div>
              <span>Dòng đang chọn</span>
              <strong>{quote?.model.name || 'Chưa chọn'}</strong>
            </div>
            <div>
              <span>Tạm tính</span>
              <strong>{quote ? formatCurrency(quote.total) : '--'}</strong>
            </div>
          </div>
          <small>{pricingDraft.bannerContent || 'Ưu đãi và phí được lấy từ file cấu hình gốc.'}</small>
        </div>
      </section>

      <section className="pricing-layout">
        <article className="panel pricing-form-card">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Thiết lập</p>
              <h3>Cấu hình xe và ưu đãi</h3>
            </div>
            <Calculator size={18} className="muted-icon" />
          </div>

          <div className="pricing-form-grid">
            <label>
              <span>Tên khách hàng</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nhập tên khách hàng" />
            </label>

            <label>
              <span>Số điện thoại</span>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Nhập số điện thoại" />
            </label>

            <label>
              <span>Tư vấn viên</span>
              <input value={consultantName} onChange={(event) => setConsultantName(event.target.value)} placeholder="Nhập tên tư vấn viên" />
            </label>

            <label>
              <span>Dòng xe</span>
              <select value={modelId} onChange={(event) => handleModelChange(event.target.value)}>
                {pricingDraft.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Phiên bản</span>
              <select value={versionId} onChange={(event) => handleVersionChange(event.target.value)}>
                {versionOptions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Màu xe</span>
              <select value={colorId} onChange={(event) => setColorId(event.target.value)}>
                {selectedVersion?.colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                )) || null}
              </select>
            </label>

            <label>
              <span>Nhóm khách hàng</span>
              <select value={customerTypeId} onChange={(event) => handleCustomerTypeChange(event.target.value)}>
                {pricingDraft.customerTypes.map((customerType) => (
                  <option key={customerType.id} value={customerType.id}>
                    {customerType.emoji} {customerType.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Khu vực phí</span>
              <select value={region} onChange={(event) => setRegion(event.target.value as 'hnhcm' | 'other')}>
                <option value="hnhcm">Hà Nội / HCM</option>
                <option value="other">Khu vực khác</option>
              </select>
            </label>

            <label>
              <span>VinClub</span>
              <select
                value={vinClubTierId || ''}
                onChange={(event) => setVinClubTierId(event.target.value || null)}
                disabled={!selectedCustomerType?.allowsVinclub || vinClubBlocked}
              >
                <option value="">Không áp dụng</option>
                {pricingDraft.vinClubTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} - {tier.discountPercentage}%
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pricing-hero-note">
            <CheckCircle2 size={16} />
            <span>
              {quote?.version.name || 'Chưa có phiên bản'} · {quote?.color?.name || 'Chưa có màu'} ·{' '}
              {selectedCustomerType?.name || 'Khách hàng'}
            </span>
          </div>

          <div className="pricing-section">
            <div className="pricing-section-header">
              <div>
                <strong>Ưu đãi áp dụng</strong>
                <p>Chọn các ưu đãi phù hợp với phiên bản và nhóm khách hàng.</p>
              </div>
              <Tag size={17} className="muted-icon" />
            </div>

            <div className="pricing-promo-list">
              {availablePromotions.map((promotion) => {
                const amount = quote?.promotionAmounts[promotion.id] || 0;
                const selected = selectedPromotionSet.has(promotion.id);
                return (
                  <label key={promotion.id} className={selected ? 'pricing-promo-item active' : 'pricing-promo-item'}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePromotion(promotion.id)}
                    />
                    <div>
                      <strong>{promotion.name}</strong>
                      <span>{selected ? `Giảm ${formatCurrency(amount)}` : describePromotion(promotion, quote?.basePrice || 0)}</span>
                    </div>
                    <ChevronRight size={16} />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pricing-section">
            <div className="pricing-section-header">
              <div>
                <strong>Phí tùy chọn</strong>
                <p>Áp dụng thêm nếu khách hàng cần dịch vụ hỗ trợ.</p>
              </div>
            </div>

            <div className="pricing-promo-list">
              {pricingDraft.optionalFees.map((fee) => {
                const selected = selectedOptionalFeeSet.has(fee.id);
                return (
                  <label key={fee.id} className={selected ? 'pricing-promo-item active' : 'pricing-promo-item'}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOptionalFee(fee.id)}
                    />
                    <div>
                      <strong>{fee.name}</strong>
                      <span>{formatCurrency(fee.defaultAmount)}</span>
                    </div>
                    <ChevronRight size={16} />
                  </label>
                );
              })}
            </div>
          </div>
        </article>

        <aside className="panel pricing-summary-card">
          <div className="dashboard-band-header">
            <div>
              <p className="eyebrow">Kết quả</p>
              <h3>Bảng tính</h3>
            </div>
            <Calculator size={18} className="muted-icon" />
          </div>

          <div className="pricing-quote-sheet" ref={quoteRef}>
            <header className="pricing-quote-header">
              <div className="pricing-brand-block">
                <div className="pricing-brand-mark">VF</div>
                <div>
                  <strong>BÁO GIÁ XE VINFAST</strong>
                  <span>Mẫu nội bộ xuất từ công cụ tính giá</span>
                </div>
              </div>
              <div className="pricing-quote-meta">
                <span>Số báo giá</span>
                <strong>{quoteNo}</strong>
                <small>Ngày lập: {quoteDate}</small>
              </div>
            </header>

            {quote?.model ? (
              <div className="pricing-quote-image-wrap">
                <img className="pricing-quote-image" src={quote.model.image} alt={quote.model.name} />
              </div>
            ) : null}

            <section className="pricing-quote-info">
              <InfoItem label="Khách hàng" value={customerName || 'Chưa nhập'} />
              <InfoItem label="SĐT" value={customerPhone || 'Chưa nhập'} />
              <InfoItem label="Tư vấn viên" value={consultantName || 'Chưa nhập'} />
              <InfoItem label="Khu vực" value={region === 'hnhcm' ? 'Hà Nội / HCM' : 'Khu vực khác'} />
            </section>

            <section className="pricing-quote-model">
              <div>
                <span>Dòng xe</span>
                <strong>{quote?.model.name || '--'}</strong>
              </div>
              <div>
                <span>Phiên bản</span>
                <strong>{quote?.version.name || '--'}</strong>
              </div>
              <div>
                <span>Màu xe</span>
                <strong>{quote?.color?.name || '--'}</strong>
              </div>
              <div>
                <span>Khách hàng</span>
                <strong>{selectedCustomerType?.name || '--'}</strong>
              </div>
            </section>

            <section className="pricing-print-summary">
              <InfoItem label="Tổng tạm tính" value={quote ? formatCurrency(quote.total) : '--'} />
              <InfoItem label="Giảm ưu đãi" value={quote ? formatCurrency(quote.promotionDiscountTotal + quote.vinClubDiscount) : '--'} />
              <InfoItem label="Phí bắt buộc" value={quote ? formatCurrency(quote.feeTotal) : '--'} />
              <InfoItem label="Phí tùy chọn" value={quote ? formatCurrency(quote.optionalFeeTotal) : '--'} />
            </section>

            <section className="pricing-print-promos">
              <div className="pricing-print-section-title">
                <strong>CTKM áp dụng</strong>
                <span>{quote?.selectedPromotions.length ? `${quote.selectedPromotions.length} ưu đãi` : 'Không có ưu đãi'}</span>
              </div>
              <div className="pricing-print-promo-list">
                {quote?.selectedPromotions.length ? (
                  quote.selectedPromotions.map((promotion) => (
                    <div key={promotion.id} className="pricing-print-promo-row">
                      <span>{promotion.name}</span>
                      <strong>
                        {quote.promotionAmounts[promotion.id]
                          ? `- ${formatCurrency(quote.promotionAmounts[promotion.id])}`
                          : '--'}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div className="pricing-print-empty">Không có CTKM được chọn</div>
                )}
              </div>
            </section>

            <div className="pricing-total-card">
              <span>Tổng tạm tính</span>
              <strong>{quote ? formatCurrency(quote.total) : '--'}</strong>
              <small>Đã bao gồm phí và các ưu đãi đang bật.</small>
            </div>

            <div className="pricing-breakdown">
              {quote?.lines.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className={line.kind === 'info' ? 'pricing-line info' : line.kind === 'discount' ? 'pricing-line discount' : 'pricing-line'}
                >
                  <div>
                    <strong>{line.label}</strong>
                    {line.detail ? <span>{line.detail}</span> : null}
                  </div>
                  <strong className={line.kind === 'discount' ? 'negative' : ''}>
                    {line.kind === 'discount' ? `- ${formatCurrency(line.amount)}` : formatCurrency(line.amount)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="pricing-stat-grid">
              <Stat label="Giá gốc" value={quote ? formatCurrency(quote.basePrice) : '--'} />
              <Stat label="Giảm ưu đãi" value={quote ? formatCurrency(quote.promotionDiscountTotal + quote.vinClubDiscount) : '--'} />
              <Stat label="Phí bắt buộc" value={quote ? formatCurrency(quote.feeTotal) : '--'} />
              <Stat label="Phí tùy chọn" value={quote ? formatCurrency(quote.optionalFeeTotal) : '--'} />
            </div>

            {pricingDraft.guideContent ? (
              <div className="pricing-guide">
                <strong>Ghi chú dữ liệu</strong>
                <p>{pricingDraft.guideContent.slice(0, 260)}…</p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
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
