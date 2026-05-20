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
  const [selectedOptionalFeeIds, setSelectedOptionalFeeIds] = React.useState<string[]>([]);
  const [region, setRegion] = React.useState<'hnhcm' | 'other'>('hnhcm');
  const [adminTargetModelId, setAdminTargetModelId] = React.useState(defaultModel);
  const [adminTargetVersionId, setAdminTargetVersionId] = React.useState(defaultVersion);
  const [adminTargetCustomerTypeId, setAdminTargetCustomerTypeId] = React.useState(defaultCustomerType);
  const [adminFlowPreset, setAdminFlowPreset] = React.useState<AdminFlowPreset>('standard');
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
                  <option value="hnhcm">Hà Nội / HCM</option>
                  <option value="other">Khu vực khác</option>
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
                      <div key={fee.id} className={`pricing-toggle-item ${selected ? 'active' : ''}`} onClick={() => toggleOptionalFee(fee.id)}>
                        <div className="pricing-toggle-info">
                          <strong>{fee.name}</strong>
                          <span>{formatCurrency(fee.defaultAmount)}</span>
                        </div>
                        <div className="pricing-toggle-switch"></div>
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
              </div>

              {quote && quote.promotionDiscountTotal + quote.vinClubDiscount > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' }}>Khuyến mãi & Ưu đãi</span>
                  {quote.selectedPromotions.map((promo) => (
                    <div key={promo.id} className="pricing-receipt-line discount">
                      <span>{promo.name}</span>
                      <strong>-{formatCurrency(quote.promotionAmounts[promo.id])}</strong>
                    </div>
                  ))}
                  {quote.vinClubDiscount > 0 && (
                    <div className="pricing-receipt-line discount">
                      <span>Chiết khấu VinClub</span>
                      <strong>-{formatCurrency(quote.vinClubDiscount)}</strong>
                    </div>
                  )}
                </div>
              )}

              {quote && quote.feeTotal > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase' }}>Phí bắt buộc (Lăn bánh)</span>
                  {pricingDraft.fees.map((fee) => {
                    const amt = region === 'hnhcm' ? fee.amountHnHcm : fee.amountOther;
                    if (!amt) return null;
                    return (
                      <div key={fee.id} className="pricing-receipt-line fee">
                        <span>{fee.name}</span>
                        <strong>{formatCurrency(amt)}</strong>
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
                        <strong>{formatCurrency(fee.defaultAmount)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pricing-result-footer">
              <span>TỔNG THANH TOÁN (ƯỚC TÍNH)</span>
              <strong>{quote ? formatCurrency(quote.total) : '--'}</strong>
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

  if (lowerName.includes('white') || lowerName.includes('blanc')) return '#f8fafc';
  if (lowerName.includes('black')) return '#1e293b';
  if (lowerName.includes('grey') || lowerName.includes('gray')) return '#64748b';
  if (lowerName.includes('red') || lowerName.includes('ruby')) return '#b91c1c';
  if (lowerName.includes('blue')) return '#3b82f6';
  if (lowerName.includes('green') || lowerName.includes('mint') || lowerName.includes('jade')) return '#10b981';
  if (lowerName.includes('yellow')) return '#facc15';
  if (lowerName.includes('pink') || lowerName.includes('rose')) return '#f472b6';
  if (lowerName.includes('silver')) return '#cbd5e1';

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
