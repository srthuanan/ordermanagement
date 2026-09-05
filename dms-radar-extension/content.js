(function () {
    console.log("🚀 VinFast DMS Radar Extension Activated!");

    // Robust helper to check Xrm availability across all Dynamics 365 frames safely
    function checkXrm() {
        try {
            if (window.Xrm && window.Xrm.WebApi) return window.Xrm;
        } catch (e) {}
        try {
            if (window.parent && window.parent.Xrm && window.parent.Xrm.WebApi) return window.parent.Xrm;
        } catch (e) {}
        try {
            if (window.top && window.top.Xrm && window.top.Xrm.WebApi) return window.top.Xrm;
        } catch (e) {}
        try {
            var frames = window.frames;
            for (var i = 0; i < frames.length; i++) {
                try {
                    if (frames[i].Xrm && frames[i].Xrm.WebApi) return frames[i].Xrm;
                } catch (fe) {}
            }
        } catch (e) {}
        return null;
    }

    // Clear existing elements & timers if re-injected
    var oldB = document.getElementById('dmsBubble');
    if (oldB) oldB.remove();
    var oldC = document.getElementById('dmsRadarControlPanel');
    if (oldC) oldC.remove();
    var oldModal = document.getElementById('soldVinsModalOverlay');
    if (oldModal) oldModal.remove();

    if (window._dmsGpsTimer) {
        clearInterval(window._dmsGpsTimer);
        window._dmsGpsTimer = null;
    }
    if (window._dmsSyncTimer) {
        clearInterval(window._dmsSyncTimer);
        window._dmsSyncTimer = null;
    }

    window._soldVinsWarning = window._soldVinsWarning || [];
    var isSyncInProgress = false;

    // Modal Close
    window._closeSoldVinsModal = function () {
        var e = document.getElementById('soldVinsModalOverlay');
        if (e) e.remove();
    };

    // Modal Show Sold VINs
    window._showSoldVinsModal = function () {
        window._closeSoldVinsModal();
        var list = window._soldVinsWarning || [];
        var o = document.createElement('div');
        o.id = 'soldVinsModalOverlay';
        o.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);';
        
        var m = document.createElement('div');
        m.style = 'background:#1e293b;width:420px;max-width:90%;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:1px solid #334155;display:flex;flex-direction:column;overflow:hidden;animation:fadeIn 0.2s ease-out;';
        
        var h = document.createElement('div');
        h.style = 'background:#0f172a;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;';
        h.innerHTML = '<h3 style="margin:0;color:#f87171;font-family:sans-serif;font-size:15px;display:flex;align-items:center;">🚨 DANH SÁCH XE ĐÃ XUẤT HĐ (' + list.length + ')</h3><button style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:0;" onclick="window._closeSoldVinsModal()">✕</button>';
        
        var b = document.createElement('div');
        b.style = 'padding:16px 20px;max-height:60vh;overflow-y:auto;font-family:monospace;font-size:14px;color:#cbd5e1;line-height:1.6;';
        
        var l = '';
        list.forEach(function (v, i) {
            l += '<div style="padding:10px 14px;background:' + (i % 2 === 0 ? '#0f172a' : '#1e293b') + ';border-radius:8px;margin-bottom:6px;display:flex;align-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);"><span style="color:#64748b;margin-right:12px;font-size:12px;font-weight:bold;width:24px;text-align:right;">' + (i + 1) + '.</span><strong style="color:#e2e8f0;letter-spacing:1px;font-size:15px;">' + v + '</strong><button style="margin-left:auto;background:#38bdf820;color:#38bdf8;border:1px solid #38bdf840;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;" onclick="navigator.clipboard.writeText(\'' + v + '\');this.innerText=\'Đã copy\';setTimeout(()=>this.innerText=\'Copy\',1500)">Copy</button></div>';
        });
        b.innerHTML = l || '<div style="color:#94a3b8;text-align:center;">Không có xe nào.</div>';

        var f = document.createElement('div');
        f.style = 'padding:12px 20px;background:#0f172a;border-top:1px solid #334155;display:flex;justify-content:space-between;';
        f.innerHTML = '<button style="background:#334155;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;" onclick="navigator.clipboard.writeText((window._soldVinsWarning||[]).join(\'\\n\'));this.innerText=\'Đã copy tất cả\';setTimeout(()=>this.innerText=\'Copy tất cả\',2000)">Copy tất cả</button><button style="background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;" onclick="window._closeSoldVinsModal()">Đóng</button>';

        m.appendChild(h);
        m.appendChild(b);
        m.appendChild(f);
        o.appendChild(m);
        document.body.appendChild(o);
    };

    const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";
    const supabaseBase = "https://jwvgxqrkjlbewvpkvucj.supabase.co/rest/v1";
    const supabaseUrl = supabaseBase + '/khoxe?select=*&limit=10000';

    const defaultHeaders = {
        'apikey': apiKey,
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
    };

    // Inject Custom Styles
    if (!document.getElementById('dmsRadarStyle')) {
        var style = document.createElement('style');
        style.id = 'dmsRadarStyle';
        style.innerHTML = `
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } 
            @keyframes radar-pulse {
                0% { transform: scale(0.9); opacity: 0.4; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 8px 3px rgba(16, 185, 129, 0.8); }
                100% { transform: scale(0.9); opacity: 0.4; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            .radar-pulsing { animation: radar-pulse 1.6s infinite ease-in-out; } 
            .marker-cluster-custom { background-color: rgba(16, 185, 129, 0.6); border-radius: 50px; } 
            .marker-cluster-custom div { background-color: rgba(16, 185, 129, 0.9); color: white; width: 30px; height: 30px; margin-left: 5px; margin-top: 5px; text-align: center; border-radius: 15px; font: bold 14px "Helvetica Neue", Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; } 
            .car-moved-alert { animation: pulse-red 2s infinite; } 
            @keyframes pulse-red { 
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } 
            }
            .leaflet-tile {
                max-width: none !important;
                max-height: none !important;
                width: 256px !important;
                height: 256px !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            .leaflet-container {
                background: #e2e8f0 !important;
                font-family: inherit;
            }
            .leaflet-tile-container img {
                max-width: none !important;
                max-height: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Floating Bubble Component
    var bubble = document.createElement('div');
    bubble.id = 'dmsBubble';
    bubble.style = 'position:fixed;top:12px;right:12px;z-index:999999;background:#111116;color:#10b981;border:1.5px solid #10b981;border-radius:30px;padding:6px 14px;cursor:pointer;font-family:sans-serif;font-size:12px;font-weight:bold;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:flex;align-items:center;gap:8px;backdrop-filter:blur(8px);user-select:none;transition:all 0.2s ease;';
    bubble.innerHTML = '<span id="bubbleDot" style="width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block;"></span><span id="bubbleText">📡 RADAR DMS</span>';

    // Control Panel Component (Hidden by default, toggle via Bubble)
    var bgControl = document.createElement('div');
    bgControl.id = 'dmsRadarControlPanel';
    bgControl.style = 'position:fixed;top:52px;right:12px;background:#111116;color:#cbd5e1;padding:18px;z-index:999999;border-radius:14px;font-family:sans-serif;font-size:13px;box-shadow:0 16px 40px rgba(0,0,0,0.6);border:1px solid rgba(16,185,129,0.3);width:310px;display:none;flex-direction:column;gap:10px;backdrop-filter:blur(12px);animation:fadeIn 0.2s ease-out;';
    bgControl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="color:#10b981;font-size:14px;display:flex;align-items:center;">📡 ULTIMATE DMS RADAR <span id="radarDot" style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: none; margin-left: 8px;"></span></b>
            <div style="display:flex;gap:6px;">
                <button id="btnBgMin" style="background:#334155;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;" title="Thu gọn thành Bong bóng">➖</button>
                <button id="btnBgClose" style="background:#ef4444;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;" title="Tắt hẳn">✕</button>
            </div>
        </div>
        <span id="bgStatus" style="color:#f59e0b;font-weight:500;">📍 Đã sẵn sàng tự động đồng bộ!</span>
        <div style="font-size:11px;color:#94a3b8;">Cập nhật cuối: <span id="bgLastTime">Chưa chạy</span></div>
        <div id="bgWarning" style="background:rgba(239,68,68,0.2);padding:6px;border-radius:4px;color:#ef4444;font-size:11px;font-weight:bold;display:none;"></div>
        <div style="border-top:1px solid #222;margin:4px 0;"></div>
        <button id="btnActivateAll" style="width:100%;background:#107c41;color:white;border:none;padding:12px;cursor:pointer;border-radius:8px;font-weight:bold;font-size:13px;line-height:1.4;box-shadow:0 4px 12px rgba(16,124,65,0.35);">
            ⚡ KÍCH HOẠT ĐỒNG BỘ TOÀN DIỆN<br>
            <span style="font-size:10px;font-weight:normal;opacity:0.9;">(Radar GPS, Đơn hàng & Kho xe Chạy Ngầm)</span>
        </button>
        <button id="btnShowMap" style="width:100%;background:#38bdf8;color:#0f172a;border:none;padding:10px;cursor:pointer;border-radius:8px;font-weight:bold;font-size:12px;margin-top:2px;">🗺️ XEM BẢN ĐỒ XE LIVE</button>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(bgControl);

    // Toggle Bubble Click Event
    bubble.onclick = function () {
        if (bgControl.style.display === 'none') {
            bgControl.style.display = 'flex';
            bubble.style.background = '#10b98120';
        } else {
            bgControl.style.display = 'none';
            bubble.style.background = '#111116';
        }
    };

    document.getElementById('btnBgMin').onclick = function () {
        bgControl.style.display = 'none';
        bubble.style.background = '#111116';
    };

    document.getElementById('btnBgClose').onclick = function () {
        if (window._dmsGpsTimer) clearInterval(window._dmsGpsTimer);
        if (window._dmsSyncTimer) clearInterval(window._dmsSyncTimer);
        bgControl.remove();
        bubble.remove();
    };

    var dmsMetadataMap = {};
    var khoxeMap = {};
    var lastTrackingResults = [];
    var previousPositions = {};

    function getDistance(lat1, lon1, lat2, lon2) {
        var R = 6371e3;
        var f1 = lat1 * Math.PI / 180;
        var f2 = lat2 * Math.PI / 180;
        var df = (lat2 - lat1) * Math.PI / 180;
        var dl = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(df / 2) * Math.sin(df / 2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function updateStatus(text, color) {
        var statusEl = document.getElementById('bgStatus');
        if (statusEl) {
            if (color) statusEl.style.color = color;
            statusEl.innerHTML = text;
        }

        var bText = document.getElementById('bubbleText');
        var bDot = document.getElementById('bubbleDot');
        if (bText) {
            if (text.indexOf('ĐANG CHẠY NGẦM') !== -1) {
                bText.textContent = '🟢 CHẠY NGẦM';
                if (bDot) bDot.style.background = '#10b981';
            } else if (text.indexOf('Đang') !== -1) {
                bText.textContent = '⏳ ĐANG QUÉT...';
                if (bDot) bDot.style.background = '#f59e0b';
            } else if (text.indexOf('✅') !== -1) {
                bText.textContent = '✅ ĐÃ XONG';
                if (bDot) bDot.style.background = '#10b981';
            } else if (text.indexOf('❌') !== -1) {
                bText.textContent = '❌ LỖI';
                if (bDot) bDot.style.background = '#ef4444';
            }
        }
    }

    function getLookupName(item, field) {
        if (!item) return "";
        const f = field.toLowerCase();
        for (let k in item) {
            if (item.hasOwnProperty(k)) {
                const kl = k.toLowerCase();
                if (kl.indexOf(f) !== -1 && kl.indexOf('@odata.community.display.v1.formattedvalue') !== -1) {
                    return item[k];
                }
            }
        }
        for (let k in item) {
            if (item.hasOwnProperty(k)) {
                const kl = k.toLowerCase();
                if (kl.indexOf(f) !== -1 && kl.indexOf('_value') !== -1) {
                    return item[k];
                }
            }
        }
        return item[field] || "";
    }

    // Accurate check for open orders: exclude explicitly cancelled/closed orders instead of strict keyword matching
    function isOpenStatus(status) {
        if (!status) return true;
        const s = String(status).toLowerCase();
        const closedKeywords = ["hủy", "huy", "cancel", "void", "đã giao", "da giao", "hoàn tất", "hoan tat", "closed", "won", "lost"];
        for (let i = 0; i < closedKeywords.length; i++) {
            if (s.indexOf(closedKeywords[i]) !== -1) return false;
        }
        return true;
    }

    function syncOrders(onComplete) {
        var xrm = checkXrm();
        if (!xrm) {
            updateStatus('❌ Không tìm thấy Xrm. Vui lòng tải lại trang DMS.', '#ef4444');
            if (onComplete) onComplete(0);
            return;
        }

        updateStatus('⏳ Đang tải dữ liệu đơn hàng mở...', '#f59e0b');
        let allRecords = [];

        function fetchPage(query) {
            xrm.WebApi.retrieveMultipleRecords("xts_newvehiclesalesorder", query).then(function success(result) {
                allRecords = allRecords.concat(result.entities);
                updateStatus('⏳ Đang nạp đơn hàng: ' + allRecords.length + ' dòng...', '#f59e0b');
                const nextLink = result["@odata.nextLink"] || result.nextLink;
                if (nextLink) {
                    const nextQuery = nextLink.includes('?') ? nextLink.substring(nextLink.indexOf('?')) : nextLink;
                    fetchPage(nextQuery);
                } else {
                    processAndSend();
                }
            }, function (error) {
                updateStatus('❌ Lỗi tải đơn hàng: ' + error.message, '#ef4444');
                if (onComplete) onComplete(0);
            });
        }

        function processAndSend() {
            const mapped = allRecords.filter(item => {
                const statusText = item["xts_status@OData.Community.Display.V1.FormattedValue"] || item["statuscode@OData.Community.Display.V1.FormattedValue"] || "";
                return isOpenStatus(statusText);
            }).map(item => ({
                new_vehicle_sales_order_id: item.xts_newvehiclesalesorderid || "",
                kiem_tra_tong_cho_hang: "",
                ngay_sua_doi: item.modifiedon || null,
                ngay_giao_dich: item.xts_transactiondate ? new Date(item.xts_transactiondate).toISOString().split('T')[0] : null,
                tu_van_ban_hang: getLookupName(item, "xts_salespersonid") || getLookupName(item, "ownerid") || "",
                so_don_hang_ban: item.xts_newvehiclesalesordernumber || "",
                so_bao_gia_xe: getLookupName(item, "xts_newvehiclesalesquoteid") || "",
                ngay_xuat_hoa_don: item.xvf_sapinvoicedate ? new Date(item.xvf_sapinvoicedate).toISOString().split('T')[0] : (item.xts_salesdate ? new Date(item.xts_salesdate).toISOString().split('T')[0] : (item.xts_deliverydate ? new Date(item.xts_deliverydate).toISOString().split('T')[0] : null)),
                khach_hang_tiem_nang: getLookupName(item, "xts_potentialcustomerid") || item.xts_potentiallookupname || item.xts_potentialcustomerdescription || "",
                promotion: getLookupName(item, "xvf_promotionid") || item.itv_promotiondetail || "",
                ma_khach_hang: item.xts_customernumber || "",
                mo_ta_san_pham: item.xts_productdescription || getLookupName(item, "xts_productid") || "",
                ten_phien_ban: getLookupName(item, "xvf_characteristicconfiguration") || getLookupName(item, "xts_productconfigurationid") || getLookupName(item, "xts_productid") || "",
                loai_tran: getLookupName(item, "itv_characteristicceilingid") || "",
                mau_ngoai_that: item.xvf_exteriorcolor || getLookupName(item, "xts_productexteriorcolorid") || "",
                mau_noi_that: item.xvf_interiorcolor || getLookupName(item, "xts_productinteriorcolorid") || "",
                ma_phien_ban: getLookupName(item, "xvf_vehiclepackage") || getLookupName(item, "xts_productconfigurationid") || "",
                ma_mau_ngoai_that: getLookupName(item, "xts_productexteriorcolorid") || getLookupName(item, "xvf_characteristicexteriorcolor") || "",
                ma_mau_noi_that: getLookupName(item, "xts_productinteriorcolorid") || getLookupName(item, "xvf_characteristicinteriorcolor") || "",
                trang_thai: item["xts_status@OData.Community.Display.V1.FormattedValue"] || item["statuscode@OData.Community.Display.V1.FormattedValue"] || "",
                pre_customer: getLookupName(item, "itv_customerpreorderid") || getLookupName(item, "itv_leadid") || "",
                so_vin: getLookupName(item, "xts_chassisid") || item.xts_chassisnumber || item.itv_vinnumber || "",
                accessory_serial: getLookupName(item, "xts_stockid") || "",
                ma_san_pham: getLookupName(item, "xts_productid") || "",
                so_ton_kho: getLookupName(item, "xts_stockid") || "",
                so_tien_thuc_sau_thue: item.xts_netamountaftertax || item.xvf_grandtotal || 0,
                don_hang_goc: getLookupName(item, "xts_originalnewvehiclesalesorderreferenceid") || getLookupName(item, "itv_originalvso") || "",
                chi_nhanh: getLookupName(item, "xts_businessunitid") || getLookupName(item, "xts_siteid") || "",
                modified_timestamp: item.modifiedon ? new Date(item.modifiedon).getTime() : 0
            }));

            const uniqueMap = new Map();
            mapped.forEach(item => {
                const key = item.so_don_hang_ban;
                if (key) {
                    const existing = uniqueMap.get(key);
                    if (!existing || item.modified_timestamp >= existing.modified_timestamp) uniqueMap.set(key, item);
                }
            });

            const finalData = Array.from(uniqueMap.values()).map(({ modified_timestamp, ...rest }) => rest);
            if (finalData.length === 0) {
                updateStatus('Không có đơn hàng mới nào.', '#cbd5e1');
                if (onComplete) onComplete(0);
                return;
            }

            let successCount = 0;
            function sendChunk(index) {
                if (index >= finalData.length) {
                    if (onComplete) onComplete(successCount);
                    return;
                }
                const chunk = finalData.slice(index, index + 200);
                updateStatus('⏳ Đang gửi đơn hàng (' + index + ' / ' + finalData.length + ')...', '#f59e0b');
                fetch(supabaseBase + "/donhanghienhuu?on_conflict=so_don_hang_ban", {
                    method: 'POST',
                    headers: {
                        ...defaultHeaders,
                        'Prefer': 'resolution=merge-duplicates, return=minimal'
                    },
                    body: JSON.stringify(chunk)
                }).then(res => {
                    if (res.ok) {
                        successCount += chunk.length;
                        sendChunk(index + 200);
                    } else {
                        res.text().then(err => {
                            updateStatus('❌ Lỗi gửi đơn hàng: ' + err, '#ef4444');
                            if (onComplete) onComplete(successCount);
                        });
                    }
                }).catch(err => {
                    updateStatus('❌ Lỗi kết nối đơn: ' + err.message, '#ef4444');
                    if (onComplete) onComplete(successCount);
                });
            }
            sendChunk(0);
        }
        fetchPage("?$filter=statecode eq 0");
    }

    function syncInventory(onComplete) {
        var xrm = checkXrm();
        if (!xrm) {
            updateStatus('❌ Không tìm thấy Xrm.', '#ef4444');
            if (onComplete) onComplete(0);
            return;
        }

        updateStatus('⏳ Đang tải dữ liệu kho xe...', '#f59e0b');
        let allRecords = [];

        function fetchPage(query) {
            xrm.WebApi.retrieveMultipleRecords("xts_inventorynewvehicle", query).then(function success(result) {
                allRecords = allRecords.concat(result.entities);
                updateStatus('⏳ Đang nạp kho xe: ' + allRecords.length + ' dòng...', '#f59e0b');
                const nextLink = result["@odata.nextLink"] || result.nextLink;
                if (nextLink) {
                    const nextQuery = nextLink.includes('?') ? nextLink.substring(nextLink.indexOf('?')) : nextLink;
                    fetchPage(nextQuery);
                } else {
                    processAndSend();
                }
            }, function (error) {
                updateStatus('❌ Lỗi tải kho xe: ' + error.message, '#ef4444');
                if (onComplete) onComplete(0);
            });
        }

        function processAndSend() {
            const soldVins = new Set(allRecords.filter(item => item._xts_lastvehicleorderid_value).map(item => String(item.xts_chassisnumber || "").trim().toUpperCase()));
            const mapped = allRecords.filter(item => {
                const vin = String(item.xts_chassisnumber || "").trim().toUpperCase();
                return vin && vin.length === 17 && !soldVins.has(vin);
            }).map(item => ({
                vin: String(item.xts_chassisnumber || "").trim().toUpperCase(),
                so_may: String(item.xts_enginenumber || ""),
                mo_ta: String(item.xts_productdescription || ""),
                khu_vuc: String(item["_xts_siteid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                phien_ban: String(item["_xts_configurationid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                ngoai_that: String(item["_xts_vehicleexteriorcolorid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                noi_that: String(item["_xts_vehicleinteriorcolorid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                nam_san_xuat: item.xts_productionyear ? parseInt(item.xts_productionyear) : null,
                inventory_id: "",
                check_sum: "",
                so_ton_kho: "",
                so_tham_chieu: "",
                ma_san_pham: "",
                so_don_hang_cuoi: "",
                modified_timestamp: item.modifiedon ? new Date(item.modifiedon).getTime() : 0
            }));

            const uniqueMap = new Map();
            mapped.forEach(item => {
                const existing = uniqueMap.get(item.vin);
                if (!existing || item.modified_timestamp >= existing.modified_timestamp) uniqueMap.set(item.vin, item);
            });

            const finalData = Array.from(uniqueMap.values()).map(({ modified_timestamp, ...rest }) => rest);
            if (finalData.length === 0) {
                updateStatus('Không có xe mới nào.', '#cbd5e1');
                if (onComplete) onComplete(0);
                return;
            }

            let successCount = 0;
            function sendChunk(index) {
                if (index >= finalData.length) {
                    if (onComplete) onComplete(successCount);
                    return;
                }
                const chunk = finalData.slice(index, index + 200);
                updateStatus('⏳ Đang gửi kho xe (' + index + ' / ' + finalData.length + ')...', '#f59e0b');
                fetch(supabaseBase + "/thongtinxe?on_conflict=vin", {
                    method: 'POST',
                    headers: {
                        ...defaultHeaders,
                        'Prefer': 'resolution=merge-duplicates, return=minimal'
                    },
                    body: JSON.stringify(chunk)
                }).then(res => {
                    if (res.ok) {
                        successCount += chunk.length;
                        sendChunk(index + 200);
                    } else {
                        res.text().then(err => {
                            updateStatus('❌ Lỗi gửi kho xe: ' + err, '#ef4444');
                            if (onComplete) onComplete(successCount);
                        });
                    }
                }).catch(err => {
                    updateStatus('❌ Lỗi kết nối kho: ' + err.message, '#ef4444');
                    if (onComplete) onComplete(successCount);
                });
            }
            sendChunk(0);
        }
        fetchPage("");
    }

    function runGPSSync(isInitialRun, onComplete) {
        updateStatus('⏳ Đang nạp danh sách xe định vị...', '#f59e0b');
        fetch(supabaseUrl, {
            headers: defaultHeaders
        }).then(function (res) {
            return res.json();
        }).then(function (khoxeData) {
            if (!Array.isArray(khoxeData) || !khoxeData.length) {
                updateStatus('⚠️ Kho xe Supabase trống hoặc lỗi!', '#ef4444');
                if (onComplete) onComplete();
                return;
            }
            khoxeMap = {};
            khoxeData.forEach(function (row) {
                if (row && row.vin) khoxeMap[row.vin.trim().toUpperCase()] = row;
            });
            var vins = Object.keys(khoxeMap).filter(function (v) {
                return v.length === 17;
            });
            updateStatus('⏳ Đang nạp thông tin xe & tọa độ từ DMS...', '#f59e0b');
            fetchDMSMetadataBatch(vins, 0, function () {
                var soldList = [];
                var dmsGpsResults = [];
                var needLiveScanVins = [];

                vins.forEach(function (v) {
                    var meta = dmsMetadataMap[v];
                    if (meta && meta.isSold) {
                        soldList.push(v);
                    }
                    if (meta && meta.lat && meta.lng && !isNaN(meta.lat) && !isNaN(meta.lng)) {
                        dmsGpsResults.push({
                            vin: v,
                            lat: meta.lat,
                            lng: meta.lng,
                            speed: 0,
                            heading: 0,
                            gpsTime: meta.lastLocationTime || '',
                            captured_at: meta.lastLocationTime ? new Date(meta.lastLocationTime).toISOString() : new Date().toISOString(),
                            lastPosition: meta.lastPosition || '',
                            success: true,
                            source: 'DMS_INVENTORY'
                        });
                    } else {
                        needLiveScanVins.push(v);
                    }
                });

                window._soldVinsWarning = soldList;
                var warnEl = document.getElementById('bgWarning');
                if (warnEl) {
                    if (soldList.length > 0) {
                        warnEl.style.display = 'block';
                        warnEl.innerHTML = '🚨 Có ' + soldList.length + ' xe đã xuất HĐ! <a href="#" style="color:#ef4444;text-decoration:underline;" onclick="window._showSoldVinsModal(); return false;">Xem DS</a>';
                    } else {
                        warnEl.style.display = 'none';
                    }
                }

                // If some VINs lack direct coordinates in DMS, attempt live TCU scan for all remaining VINs
                if (needLiveScanVins.length > 0) {
                    updateStatus('⏳ Đã lấy ' + dmsGpsResults.length + ' xe từ DMS. Đang quét sóng Live cho ' + needLiveScanVins.length + ' xe còn lại...', '#f59e0b');
                    fetchLiveLocations(needLiveScanVins).then(function (liveResults) {
                        var combined = dmsGpsResults.concat(liveResults);
                        finalizeGpsResults(combined);
                    });
                } else {
                    finalizeGpsResults(dmsGpsResults);
                }

                function finalizeGpsResults(results) {
                    lastTrackingResults = results;
                    var now = new Date();
                    var timeEl = document.getElementById('bgLastTime');
                    if (timeEl) timeEl.textContent = now.toLocaleTimeString();

                    // High-performance: Bulk Upsert all coordinates in chunks to Supabase car_telemetry
                    var validGpsRecords = results.filter(function (r) {
                        return r.success && !isNaN(r.lat) && !isNaN(r.lng);
                    }).map(function (r) {
                        return {
                            vin: r.vin,
                            lat: r.lat,
                            lng: r.lng,
                            speed: r.speed || 0,
                            heading: r.heading || 0,
                            captured_at: r.captured_at || now.toISOString(),
                            updated_at: now.toISOString()
                        };
                    });

                    if (validGpsRecords.length > 0) {
                        updateStatus('⏳ Đang lưu ' + validGpsRecords.length + ' tọa độ GPS vào hệ thống...', '#38bdf8');
                        sendTelemetryChunks(validGpsRecords, 0, function () {
                            updateStatus('✅ Đã nạp ' + validGpsRecords.length + ' tọa độ xe từ DMS!', '#10b981');
                            if (isInitialRun) {
                                loadLeaflet(results, vins.length);
                            }
                            if (onComplete) onComplete();
                        });
                    } else {
                        updateStatus('⚠️ Chưa có xe nào có tọa độ trên DMS.', '#ef4444');
                        if (isInitialRun) {
                            loadLeaflet(results, vins.length);
                        }
                        if (onComplete) onComplete();
                    }
                }
            });
        }).catch(function (err) {
            updateStatus('❌ Lỗi định vị: ' + err.message, '#ef4444');
            if (onComplete) onComplete();
        });
    }

    // Helper to send telemetry in bulk batches of 200
    function sendTelemetryChunks(records, index, callback) {
        if (index >= records.length) {
            if (callback) callback();
            return;
        }
        var chunk = records.slice(index, index + 200);
        fetch(supabaseBase + "/car_telemetry", {
            method: 'POST',
            headers: {
                ...defaultHeaders,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(chunk)
        }).then(function (res) {
            sendTelemetryChunks(records, index + 200, callback);
        }).catch(function (err) {
            console.error("Lỗi gửi bulk car_telemetry:", err);
            sendTelemetryChunks(records, index + 200, callback);
        });
    }

    function fetchDMSMetadataBatch(vins, index, onComplete) {
        var xrm = checkXrm();
        if (!xrm || index >= vins.length) {
            onComplete();
            return;
        }
        var batchSize = 30;
        var batch = vins.slice(index, index + batchSize);
        var filter = batch.map(function (v) {
            return "xts_chassisnumber eq '" + v + "'";
        }).join(' or ');

        function fetchSingleBatchPage(query) {
            xrm.WebApi.retrieveMultipleRecords("xts_inventorynewvehicle", query).then(function (result) {
                result.entities.forEach(function (item) {
                    var vin = String(item.xts_chassisnumber || '').trim().toUpperCase();
                    if (vin && !dmsMetadataMap[vin]) {
                        var latVal = item.itv_lastlatitude != null ? parseFloat(item.itv_lastlatitude) : null;
                        var lngVal = item.itv_lastlongitude != null ? parseFloat(item.itv_lastlongitude) : null;
                        dmsMetadataMap[vin] = {
                            model: item.xts_productdescription,
                            color: item["_xts_vehicleexteriorcolorid_value@OData.Community.Display.V1.FormattedValue"],
                            interior: item["_xts_vehicleinteriorcolorid_value@OData.Community.Display.V1.FormattedValue"],
                            site: item["_xts_siteid_value@OData.Community.Display.V1.FormattedValue"],
                            isSold: !!item._xts_lastvehicleorderid_value,
                            lat: (!isNaN(latVal) && latVal !== 0) ? latVal : null,
                            lng: (!isNaN(lngVal) && lngVal !== 0) ? lngVal : null,
                            lastLocationTime: item.itv_lastlocationupdatetime || null,
                            lastPosition: item.itv_lastposition || ''
                        };
                    }
                });
                var nextLink = result["@odata.nextLink"] || result.nextLink;
                if (nextLink) {
                    const nextQuery = nextLink.includes('?') ? nextLink.substring(nextLink.indexOf('?')) : nextLink;
                    fetchSingleBatchPage(nextQuery);
                } else {
                    fetchDMSMetadataBatch(vins, index + batchSize, onComplete);
                }
            }, function (err) {
                console.warn("fetchDMSMetadataBatch warning:", err);
                fetchDMSMetadataBatch(vins, index + batchSize, onComplete);
            });
        }
        var query = "?$filter=" + filter;
        fetchSingleBatchPage(query);
    }

    window._vfDebugGpsCount = 0;

    function fetchLiveLocation(vin, forceLiveUpdate) {
        return new Promise(function (resolve) {
            var isUpdateFlag = forceLiveUpdate !== undefined ? forceLiveUpdate : false;
            var payload = {
                itv_requestObject: JSON.stringify({
                    data: [{ vinCode: vin }],
                    isUpdate: isUpdateFlag
                })
            };

            fetch("/api/data/v9.2/itv_trackingvehicleposition", {
                method: "POST",
                headers: {
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                    "Accept": "application/json",
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify(payload)
            }).then(function (res) {
                if (res.status === 200 || res.status === 204) {
                    return res.json();
                }
                return null;
            }).then(function (responseObj) {
                if (!responseObj || !responseObj.itv_responseObject) {
                    resolve({ vin: vin, success: false });
                    return;
                }
                try {
                    var rawInner = JSON.parse(responseObj.itv_responseObject);
                    
                    // Support all known DMS structures:
                    // 1. { code: 200, data: [ { ... } ] }
                    // 2. { data: [ { ... } ] }
                    // 3. [ { ... } ]
                    // 4. { Lat, Long, ... }
                    var data = rawInner;
                    if (rawInner && rawInner.data && Array.isArray(rawInner.data) && rawInner.data.length > 0) {
                        data = rawInner.data[0];
                    } else if (rawInner && rawInner.result && Array.isArray(rawInner.result) && rawInner.result.length > 0) {
                        data = rawInner.result[0];
                    } else if (Array.isArray(rawInner) && rawInner.length > 0) {
                        data = rawInner[0];
                    } else if (rawInner && rawInner.data && typeof rawInner.data === 'object') {
                        data = rawInner.data;
                    }

                    // Print first 3 raw GPS responses to Console for inspection
                    if (window._vfDebugGpsCount < 3) {
                        window._vfDebugGpsCount++;
                        console.log("🛰️ [DMS GPS RAW PACKET for " + vin + "]:", data);
                    }

                    var lat = parseFloat(data.Lat || data.lat || data.latitude || data.Latitude);
                    var lng = parseFloat(data.Long || data.long || data.Lng || data.lng || data.longitude || data.Longitude);

                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        var speedVal = parseFloat(data.Speed || data.speed || data.Velocity || data.velocity || 0);
                        var headingVal = parseFloat(data.Heading || data.heading || data.Bearing || data.bearing || data.Angle || data.angle || 0);

                        // Prioritize real GPS packet timestamp over record creation date
                        var tVal = data.gpsTime || data.deviceTime || data.trackingTime || data.locationTime || data.time || data.timestamp || data.updatedTime || data.dateTime || data.lastLocationTime || "";
                        
                        if (!tVal) {
                            for (var k in data) {
                                var kl = k.toLowerCase();
                                if ((kl.indexOf('time') > -1 || kl.indexOf('date') > -1) && kl.indexOf('create') === -1 && kl.indexOf('record') === -1) {
                                    if (typeof data[k] === 'string' || typeof data[k] === 'number') {
                                        tVal = data[k];
                                        break;
                                    }
                                }
                            }
                        }

                        var p = tVal;
                        if (typeof tVal === 'string' && /^\d+$/.test(tVal)) p = parseInt(tVal, 10);
                        if (typeof p === 'number' && p < 10000000000) p = p * 1000;
                        var dt = new Date(p);
                        var actualGpsIso = isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();

                        resolve({
                            vin: vin,
                            lat: lat,
                            lng: lng,
                            speed: isNaN(speedVal) ? 0 : speedVal,
                            heading: isNaN(headingVal) ? 0 : headingVal,
                            gpsTime: tVal,
                            captured_at: actualGpsIso,
                            success: true
                        });
                    } else {
                        resolve({ vin: vin, success: false });
                    }
                } catch (e) {
                    resolve({ vin: vin, success: false });
                }
            }).catch(function () {
                resolve({ vin: vin, success: false });
            });
        });
    }

    // Expose quick test helper to browser window console for user debugging
    window.testDmsGps = function(vin, isUpdate) {
        vin = vin || "RLNVSJSE4TH805590";
        isUpdate = !!isUpdate;
        console.log("🔍 Đang gửi request test GPS cho VIN: " + vin + " (isUpdate=" + isUpdate + ")...");
        var payload = {
            itv_requestObject: JSON.stringify({
                data: [{ vinCode: vin }],
                isUpdate: isUpdate
            })
        };
        return fetch("/api/data/v9.2/itv_trackingvehicleposition", {
            method: "POST",
            headers: {
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                "Accept": "application/json",
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify(payload)
        }).then(res => res.json()).then(res => {
            console.log("📦 RAW Response:", res);
            try {
                var inner = JSON.parse(res.itv_responseObject);
                console.log("🎯 PARSED itv_responseObject:", inner);
            } catch(e) {
                console.log("RAW itv_responseObject:", res.itv_responseObject);
            }
            return res;
        });
    };

    async function fetchLiveLocations(vins) {
        var results = [];
        var concurrency = 5;
        for (var i = 0; i < vins.length; i += concurrency) {
            var batch = vins.slice(i, i + concurrency);
            results = results.concat(await Promise.all(batch.map(function (v) {
                return fetchLiveLocation(v);
            })));
            updateStatus('⏳ Đang quét Radar: ' + Math.min(i + concurrency, vins.length) + ' / ' + vins.length + ' xe...', '#38bdf8');
            if (i + concurrency < vins.length) {
                await new Promise(function (r) {
                    setTimeout(r, 350);
                });
            }
        }
        return results;
    }

    function loadLeaflet(trackingData, totalKho) {
        if (window.L && window.L.markerClusterGroup) {
            showMap(trackingData, totalKho);
            return;
        }
        if (!document.getElementById('leafletCss')) {
            var css = document.createElement('link');
            css.id = 'leafletCss';
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }
        if (!document.getElementById('markerClusterCss')) {
            var css2 = document.createElement('link');
            css2.id = 'markerClusterCss';
            css2.rel = 'stylesheet';
            css2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
            document.head.appendChild(css2);
        }
        var js = document.createElement('script');
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        js.onerror = function () {
            alert('⚠️ Trình duyệt chặn tải thư viện Leaflet do chính sách CSP của Dynamics.\n\nDữ liệu GPS vẫn được cập nhật tự động lên Supabase thành công!');
        };
        js.onload = function () {
            var js2 = document.createElement('script');
            js2.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
            js2.onload = function () {
                showMap(trackingData, totalKho);
            };
            document.head.appendChild(js2);
        };
        document.head.appendChild(js);
    }

    function showMap(trackingData, totalKho) {
        function formatTime(t) {
            if (!t) return 'Không rõ';
            var p = t;
            if (typeof t === 'string' && /^\d+$/.test(t)) p = parseInt(t, 10);
            if (typeof p === 'number' && p < 10000000000) p = p * 1000;
            var dt = new Date(p);
            if (isNaN(dt.getTime())) return String(t);
            var h = dt.getHours(), m = dt.getMinutes(), d = dt.getDate(), mo = dt.getMonth() + 1;
            return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ' ' + (d < 10 ? '0' + d : d) + '/' + (mo < 10 ? '0' + mo : mo);
        }
        
        var trackingMap = {};
        trackingData.forEach(function (item) {
            if (item && item.vin) {
                trackingMap[item.vin.trim().toUpperCase()] = item;
            }
        });

        var allCars = [];
        var carsWithGPS = [];
        var allVins = Object.keys(khoxeMap);
        if (allVins.length === 0) {
            trackingData.forEach(function (t) {
                if (t && t.vin) allVins.push(t.vin.trim().toUpperCase());
            });
        }

        allVins.forEach(function (vin) {
            var kho = khoxeMap[vin] || {};
            var meta = dmsMetadataMap[vin] || {};
            var track = trackingMap[vin] || {};

            var latVal = track.lat != null ? track.lat : (meta.lat != null ? meta.lat : null);
            var lngVal = track.lng != null ? track.lng : (meta.lng != null ? meta.lng : null);
            var hasGps = !isNaN(latVal) && !isNaN(lngVal) && latVal !== 0 && lngVal !== 0 && latVal != null;

            var isMoved = false;
            var moveDistance = 0;
            if (hasGps) {
                if (previousPositions[vin]) {
                    moveDistance = getDistance(previousPositions[vin].lat, previousPositions[vin].lng, latVal, lngVal);
                    if (moveDistance > 200) isMoved = true;
                }
                previousPositions[vin] = { lat: latVal, lng: lngVal };
            }

            var car = {
                vin: vin,
                hasGps: hasGps,
                lat: hasGps ? latVal : null,
                lng: hasGps ? lngVal : null,
                speed: track.speed || 0,
                heading: track.heading || 0,
                gpsTime: track.gpsTime || meta.lastLocationTime || '',
                lastPosition: track.lastPosition || meta.lastPosition || '',
                model: meta.model || kho.dong_xe || 'Dữ liệu nội bộ',
                color: meta.color || '',
                interior: meta.interior || '',
                site: meta.site || 'Không rõ bãi',
                trangThai: kho.trang_thai || 'Trống',
                nguoiGiu: kho.nguoi_giu_xe || '',
                isMoved: isMoved,
                moveDist: Math.round(moveDistance)
            };

            allCars.push(car);
            if (hasGps) carsWithGPS.push(car);
        });

        function getColor(st) {
            if (st === 'Chưa ghép') return '#00ff88';
            if (st === 'Đang giữ') return '#ffbb00';
            if (st === 'Đã chốt') return '#ff4466';
            return '#00bfff';
        }

        var overlay = document.createElement('div');
        overlay.style = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999998;background:rgba(0,0,0,0.7);';
        
        var container = document.createElement('div');
        container.style = 'position:fixed;top:20px;left:20px;right:20px;bottom:20px;z-index:999999;background:white;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
        
        var header = document.createElement('div');
        header.style = 'background:#111;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;flex-shrink:0;';
        
        var alertCount = carsWithGPS.filter(function (c) { return c.isMoved; }).length;
        var headerText = '📡 ' + carsWithGPS.length + '/' + allCars.length + ' xe đang phát sóng GPS (Tổng kho: ' + allCars.length + ' xe)';
        if (alertCount > 0) headerText += ' | 🚨 Có ' + alertCount + ' xe đang di chuyển!';
        header.innerHTML = '<span style="font-size:15px;font-weight:bold">' + headerText + '</span>';

        var rightHeaderControls = document.createElement('div');
        rightHeaderControls.style = 'display:flex;align-items:center;gap:8px;';

        var btnStreet = document.createElement('button');
        btnStreet.innerHTML = '🗺️ Đường phố';
        btnStreet.title = 'Bản đồ đường phố Carto';
        btnStreet.style = 'background:#38bdf8;color:#0f172a;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;';

        var btnGoogle = document.createElement('button');
        btnGoogle.innerHTML = '📍 Google Maps';
        btnGoogle.title = 'Bản đồ Google Maps';
        btnGoogle.style = 'background:#334155;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;';

        var btnSat = document.createElement('button');
        btnSat.innerHTML = '🛰️ Vệ tinh';
        btnSat.title = 'Bản đồ vệ tinh Google Hybrid';
        btnSat.style = 'background:#334155;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;';

        var btnOpenWebApp = document.createElement('button');
        btnOpenWebApp.innerHTML = '🌐 Mở Web App';
        btnOpenWebApp.title = 'Mở bản đồ live chi tiết trên Web App';
        btnOpenWebApp.style = 'background:#10b981;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;';
        btnOpenWebApp.onclick = function () {
            window.open('https://srthuanan.com/live-map', '_blank') || window.open(window.location.origin, '_blank');
        };

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Đóng';
        closeBtn.style = 'background:#ff4466;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;margin-left:6px;';
        closeBtn.onclick = function () {
            overlay.remove();
            container.remove();
        };

        rightHeaderControls.appendChild(btnStreet);
        rightHeaderControls.appendChild(btnGoogle);
        rightHeaderControls.appendChild(btnSat);
        rightHeaderControls.appendChild(btnOpenWebApp);
        rightHeaderControls.appendChild(closeBtn);
        header.appendChild(rightHeaderControls);
        container.appendChild(header);

        var mainBody = document.createElement('div');
        mainBody.style = 'display:flex;flex-grow:1;height:calc(100% - 48px);overflow:hidden;';
        container.appendChild(mainBody);

        var mapDiv = document.createElement('div');
        mapDiv.style = 'flex-grow:1;height:100%;';
        mainBody.appendChild(mapDiv);

        var listDiv = document.createElement('div');
        listDiv.style = 'width:360px;height:100%;background:#f9f9f9;border-left:1px solid #ccc;display:flex;flex-direction:column;';
        mainBody.appendChild(listDiv);

        var listHeader = document.createElement('div');
        listHeader.style = 'padding:12px 14px;background:#fff;border-bottom:1px solid #ddd;display:flex;flex-direction:column;gap:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05);z-index:2;';
        listHeader.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:bold;font-size:14px;color:#0f172a;">📋 Danh sách kho</span>
                <span id="dmsCarCountBadge" style="color:#fff;background:#0284c7;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">${allCars.length} chiếc</span>
            </div>
            <input id="dmsCarSearchInput" type="text" placeholder="🔍 Tìm theo VIN, dòng xe, màu..." style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;box-sizing:border-box;outline:none;" />
            <div style="display:flex;gap:4px;">
                <button id="btnFilterAll" style="flex:1;padding:5px 2px;border:none;border-radius:4px;font-size:11px;font-weight:bold;background:#0284c7;color:#fff;cursor:pointer;">Tất cả (${allCars.length})</button>
                <button id="btnFilterGps" style="flex:1;padding:5px 2px;border:none;border-radius:4px;font-size:11px;font-weight:bold;background:#f1f5f9;color:#334155;cursor:pointer;">Có GPS (${carsWithGPS.length})</button>
                <button id="btnFilterNoGps" style="flex:1;padding:5px 2px;border:none;border-radius:4px;font-size:11px;font-weight:bold;background:#f1f5f9;color:#64748b;cursor:pointer;">Chưa có (${allCars.length - carsWithGPS.length})</button>
            </div>
        `;
        listDiv.appendChild(listHeader);

        var listItems = document.createElement('div');
        listItems.style = 'flex-grow:1;overflow-y:auto;font-family:sans-serif;';
        listDiv.appendChild(listItems);

        document.body.appendChild(overlay);
        document.body.appendChild(container);

        var initCenter = carsWithGPS.length > 0 ? [carsWithGPS[0].lat, carsWithGPS[0].lng] : [10.952, 106.712];
        var map = L.map(mapDiv, {
            attributionControl: false
        }).setView(initCenter, 12);

        var tileProviders = {
            carto: {
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: { maxZoom: 19 }
            },
            google: {
                url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                options: { maxZoom: 20 }
            },
            satellite: {
                url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                options: { maxZoom: 20 }
            },
            esri: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                options: { maxZoom: 19 }
            }
        };

        var currentTileLayer = null;
        function updateLayerButtons(activeKey) {
            btnStreet.style.background = (activeKey === 'carto' ? '#38bdf8' : '#334155');
            btnStreet.style.color = (activeKey === 'carto' ? '#0f172a' : '#fff');
            btnGoogle.style.background = (activeKey === 'google' ? '#38bdf8' : '#334155');
            btnGoogle.style.color = (activeKey === 'google' ? '#0f172a' : '#fff');
            btnSat.style.background = (activeKey === 'satellite' ? '#38bdf8' : '#334155');
            btnSat.style.color = (activeKey === 'satellite' ? '#0f172a' : '#fff');
        }

        function setTileLayer(key) {
            if (currentTileLayer) {
                map.removeLayer(currentTileLayer);
            }
            var prov = tileProviders[key] || tileProviders.carto;
            currentTileLayer = L.tileLayer(prov.url, prov.options).addTo(map);
            updateLayerButtons(key);

            var fallbackDone = false;
            currentTileLayer.on('tileerror', function () {
                if (!fallbackDone && key === 'carto') {
                    fallbackDone = true;
                    console.warn("⚠️ Carto tiles không tải được, tự động chuyển sang Google Maps...");
                    setTileLayer('google');
                }
            });
        }

        btnStreet.onclick = function () { setTileLayer('carto'); };
        btnGoogle.onclick = function () { setTileLayer('google'); };
        btnSat.onclick = function () { setTileLayer('satellite'); };

        // Default to Google Maps directly for flawless Vietnamese map rendering
        setTileLayer('google');

        var markersGroup = L.markerClusterGroup({
            iconCreateFunction: function (cluster) {
                var childCount = cluster.getChildCount();
                return new L.DivIcon({
                    html: '<div><span>' + childCount + '</span></div>',
                    className: 'marker-cluster-custom',
                    iconSize: new L.Point(40, 40)
                });
            }
        });

        var markersMap = {};
        var bounds = [];

        carsWithGPS.forEach(function (car) {
            var clr = getColor(car.trangThai);
            var mOptions = {
                radius: 7,
                fillColor: clr,
                color: (car.isMoved ? '#ef4444' : '#000'),
                weight: (car.isMoved ? 3 : 1.5),
                opacity: 1,
                fillOpacity: 0.85
            };
            if (car.isMoved) mOptions.className = 'car-moved-alert';
            var marker = L.circleMarker([car.lat, car.lng], mOptions);
            var popupId = "addr-" + car.vin;
            var colorText = (car.color || 'Chưa rõ') + (car.interior ? ' / ' + car.interior : '');
            var timeDisplay = car.gpsTime ? formatTime(car.gpsTime) : 'Chưa có data';
            var movedAlert = car.isMoved ? '<div style="background:#fef2f2;border:1px solid #f87171;color:#b91c1c;padding:6px;border-radius:6px;margin-bottom:8px;">🚨 <b>Xe vừa di chuyển ' + car.moveDist + 'm!</b></div>' : '';
            var speedText = car.speed > 0 ? '<br>⚡ <b>Tốc độ:</b> ' + car.speed + ' km/h' : '';
            var addrHtml = car.lastPosition ? ('<b style="color:#0284c7;">' + car.lastPosition + '</b>') : '<span id="' + popupId + '" style="color:#555;font-style:italic;">⏳ Đang giải mã tên đường...</span>';
            var popupContent = '<div style="font-family:sans-serif;min-width:240px;font-size:13px;line-height:1.5;">' + movedAlert + '<b style="font-size:15px">' + car.vin + '</b><br><br>🚗 <b>' + car.model + '</b><br>🎨 Màu sắc: '+ colorText + '<br>🏢 Khu vực: ' + car.site + speedText + '<br><br>📍 <b>Vị trí hiện tại:</b><br>' + addrHtml + '<br>⏱ <b style="color:#e67e22;">Cập nhật: ' + timeDisplay + '</b><br><br><span style="color:' + clr + ';font-weight:bold;font-size:14px;">● ' + car.trangThai + (car.nguoiGiu ? ' - ' + car.nguoiGiu : '') + '</span></div>';
            
            marker.bindPopup(popupContent);
            bounds.push([car.lat, car.lng]);
            markersGroup.addLayer(marker);
            markersMap[car.vin] = marker;

            marker.on('popupopen', function () {
                if (!marker.addressLoaded && !car.lastPosition) {
                    var bdcUrl = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + car.lat + '&longitude=' + car.lng + '&localityLanguage=vi';
                    fetch(bdcUrl).then(function (r) {
                        return r.json();
                    }).then(function (d) {
                        var parts = [];
                        if (d.locality) parts.push(d.locality);
                        if (d.city && d.city !== d.principalSubdivision) parts.push(d.city);
                        if (d.principalSubdivision) parts.push(d.principalSubdivision);
                        var addrStr = parts.join(', ');
                        var el = document.getElementById(popupId);
                        if (el) el.innerHTML = '<b style="color:#000;">' + (addrStr || ('Tọa độ: ' + car.lat.toFixed(6) + ', ' + car.lng.toFixed(6))) + '</b>';
                        marker.addressLoaded = true;
                    }).catch(function () {
                        fetch('https://photon.komoot.io/reverse?lat=' + car.lat + '&lon=' + car.lng).then(function (r) {
                            return r.json();
                        }).then(function (d) {
                            var p = d.features && d.features[0] && d.features[0].properties;
                            var addr = p ? [p.name || p.street, p.district, p.city, p.state].filter(Boolean).join(', ') : '';
                            var el = document.getElementById(popupId);
                            if (el) el.innerHTML = '<b style="color:#000;">' + (addr || ('Tọa độ: ' + car.lat.toFixed(6) + ', ' + car.lng.toFixed(6))) + '</b>';
                            marker.addressLoaded = true;
                        }).catch(function () {
                            var el = document.getElementById(popupId);
                            if (el) el.innerHTML = 'Tọa độ: ' + car.lat.toFixed(6) + ', ' + car.lng.toFixed(6);
                        });
                    });
                }
            });
        });

        // Filter and Search rendering
        var currentFilter = 'all'; // 'all', 'gps', 'nogps'
        var currentSearch = '';

        function renderList() {
            listItems.innerHTML = '';
            var activeBounds = [];
            markersGroup.clearLayers();

            var filtered = allCars.filter(function (car) {
                if (currentFilter === 'gps' && !car.hasGps) return false;
                if (currentFilter === 'nogps' && car.hasGps) return false;
                if (currentSearch) {
                    var terms = currentSearch.toLowerCase().split(/[\n,;\t\s]+/).filter(function (t) { return t.length > 0; });
                    if (terms.length > 0) {
                        var isMatched = false;
                        for (var k = 0; k < terms.length; k++) {
                            var term = terms[k];
                            if (car.vin.toLowerCase().indexOf(term) !== -1 ||
                                (car.model || '').toLowerCase().indexOf(term) !== -1 ||
                                (car.color || '').toLowerCase().indexOf(term) !== -1 ||
                                (car.nguoiGiu || '').toLowerCase().indexOf(term) !== -1 ||
                                (car.site || '').toLowerCase().indexOf(term) !== -1) {
                                isMatched = true;
                                break;
                            }
                        }
                        if (!isMatched) return false;
                    }
                }
                return true;
            });

            document.getElementById('dmsCarCountBadge').textContent = filtered.length + ' chiếc';

            if (filtered.length === 0) {
                listItems.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;">Không tìm thấy xe nào phù hợp.</div>';
                return;
            }

            filtered.forEach(function (car) {
                var clr = getColor(car.trangThai);
                var item = document.createElement('div');
                var itemBg = car.isMoved ? '#fef2f2' : (car.hasGps ? '#fff' : '#f8fafc');
                item.style = 'padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;display:flex;flex-direction:column;gap:5px;background:' + itemBg + ';transition:0.2s;';
                item.onmouseover = function () { item.style.background = '#f0f5ff'; };
                item.onmouseout = function () { item.style.background = itemBg; };

                var marker = markersMap[car.vin];
                if (car.hasGps && marker) {
                    markersGroup.addLayer(marker);
                    activeBounds.push([car.lat, car.lng]);
                }

                item.onclick = function () {
                    if (car.hasGps && marker) {
                        markersGroup.zoomToShowLayer(marker, function () {
                            map.setView([car.lat, car.lng], 18, { animate: true });
                            marker.openPopup();
                        });
                    } else {
                        alert('ℹ️ Xe ' + car.vin + ' (' + car.model + '):\n\nXe hiện chưa phát sóng GPS lên máy chủ VinFast (Hộp TCU đang tắt nguồn hoặc xe đang được cắt cọc bình trong kho).');
                    }
                };

                var formattedVin = car.vin.slice(0, 11) + '<strong style="color:#000;font-size:13px;">' + car.vin.slice(11) + '</strong>';
                if (car.isMoved) formattedVin = '🚨 ' + formattedVin;

                var colorText = (car.color || 'Chưa rõ') + (car.interior ? ' / ' + car.interior : '');
                var timeDisplay = car.gpsTime ? formatTime(car.gpsTime) : null;
                var gpsBadge = car.hasGps 
                    ? '<span style="font-size:11px;color:#0284c7;font-weight:bold;">⏱ ' + timeDisplay + '</span>'
                    : '<span style="font-size:10px;color:#94a3b8;background:#e2e8f0;padding:2px 6px;border-radius:4px;">Chưa có GPS</span>';

                item.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:#555;">${formattedVin}</span>
                        <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:${clr}40;color:#000;font-weight:bold;border:1px solid ${clr};">${car.trangThai}</span>
                    </div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;">${car.model}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
                        <span style="font-size:11px;color:#64748b;">🎨 ${colorText}</span>
                        ${gpsBadge}
                    </div>
                `;
                listItems.appendChild(item);
            });

            if (currentSearch && activeBounds.length > 0) {
                map.fitBounds(activeBounds, { padding: [50, 50], maxZoom: 16 });
            }
        }

        renderList();

        // Filter button handlers
        var btnFilterAll = document.getElementById('btnFilterAll');
        var btnFilterGps = document.getElementById('btnFilterGps');
        var btnFilterNoGps = document.getElementById('btnFilterNoGps');
        var searchInput = document.getElementById('dmsCarSearchInput');

        function updateFilterTabs(activeTab) {
            btnFilterAll.style.background = (activeTab === 'all' ? '#0284c7' : '#f1f5f9');
            btnFilterAll.style.color = (activeTab === 'all' ? '#fff' : '#334155');
            btnFilterGps.style.background = (activeTab === 'gps' ? '#0284c7' : '#f1f5f9');
            btnFilterGps.style.color = (activeTab === 'gps' ? '#fff' : '#334155');
            btnFilterNoGps.style.background = (activeTab === 'nogps' ? '#0284c7' : '#f1f5f9');
            btnFilterNoGps.style.color = (activeTab === 'nogps' ? '#fff' : '#64748b');
        }

        btnFilterAll.onclick = function () { currentFilter = 'all'; updateFilterTabs('all'); renderList(); };
        btnFilterGps.onclick = function () { currentFilter = 'gps'; updateFilterTabs('gps'); renderList(); };
        btnFilterNoGps.onclick = function () { currentFilter = 'nogps'; updateFilterTabs('nogps'); renderList(); };

        searchInput.oninput = function () {
            currentSearch = (searchInput.value || '').trim();
            renderList();
        };

        map.addLayer(markersGroup);
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        setTimeout(function () {
            map.invalidateSize();
        }, 80);
        setTimeout(function () {
            map.invalidateSize();
        }, 300);
        setTimeout(function () {
            map.invalidateSize();
        }, 700);
    }

    // Auto-Activation Logic with Race Condition Protection
    function startAutoSync() {
        if (isSyncInProgress) {
            console.log("ℹ️ Tiến trình đồng bộ đang chạy, vui lòng đợi...");
            return;
        }
        isSyncInProgress = true;

        var rDot = document.getElementById('radarDot');
        if (rDot) {
            rDot.style.display = 'inline-block';
            rDot.className = 'radar-pulsing';
        }
        updateStatus('🤖 Đang kích hoạt đồng bộ ban đầu...', '#f59e0b');

        runGPSSync(true, function () {
            syncOrders(function () {
                syncInventory(function () {
                    isSyncInProgress = false;
                    updateStatus('✅ Đã cập nhật vị trí, đơn hàng và kho xe.', '#10b981');
                    setTimeout(function () {
                        updateStatus('🟢 ĐANG CHẠY NGẦM LIÊN TỤC...', '#10b981');
                    }, 4000);
                });
            });
        });

        if (window._dmsGpsTimer) clearInterval(window._dmsGpsTimer);
        if (window._dmsSyncTimer) clearInterval(window._dmsSyncTimer);

        // 30 min GPS radar interval
        window._dmsGpsTimer = setInterval(function () {
            if (isSyncInProgress) return;
            isSyncInProgress = true;
            runGPSSync(false, function () {
                isSyncInProgress = false;
                updateStatus('✅ Đã cập nhật vị trí.', '#10b981');
                setTimeout(function () {
                    updateStatus('🟢 ĐANG CHẠY NGẦM LIÊN TỤC...', '#10b981');
                }, 4000);
            });
        }, 30 * 60 * 1000);

        // 4 hour Order & Inventory interval
        window._dmsSyncTimer = setInterval(function () {
            if (isSyncInProgress) return;
            isSyncInProgress = true;
            updateStatus('⏳ Đang đồng bộ Đơn hàng & Kho xe định kỳ...', '#f59e0b');
            syncOrders(function () {
                syncInventory(function () {
                    isSyncInProgress = false;
                    updateStatus('✅ Đã cập nhật đơn hàng và kho xe.', '#10b981');
                    setTimeout(function () {
                        updateStatus('🟢 ĐANG CHẠY NGẦM LIÊN TỤC...', '#10b981');
                    }, 4000);
                });
            });
        }, 4 * 60 * 60 * 1000);

        updateStatus('🚀 Đã kích hoạt Chạy Ngầm liên tục!<br>• GPS Live: 30 phút/lần<br>• Đơn hàng & Kho xe: 4 tiếng/lần', '#10b981');
    }

    // Bind UI Buttons
    document.getElementById('btnActivateAll').onclick = startAutoSync;
    document.getElementById('btnShowMap').onclick = function () {
        if (lastTrackingResults.length > 0) {
            loadLeaflet(lastTrackingResults, Object.keys(khoxeMap).length);
        } else {
            alert('Vui lòng đợi Tool đồng bộ dữ liệu lần đầu xong!');
        }
    };

    // Smart polling to auto-trigger when Xrm becomes ready
    function initWhenReady(retries) {
        retries = retries || 0;
        var xrm = checkXrm();
        if (xrm) {
            console.log("⚡ Xrm ready! Auto-starting sync process...");
            startAutoSync();
        } else if (retries < 20) {
            setTimeout(function () {
                initWhenReady(retries + 1);
            }, 1500);
        } else {
            console.log("ℹ️ DMS Xrm chưa sẵn sàng. Bạn có thể nhấn nút Kích hoạt thủ công.");
        }
    }

    setTimeout(function () {
        initWhenReady(0);
    }, 2000);

})();
