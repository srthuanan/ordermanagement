const fs = require('fs');

const rawTxt = fs.readFileSync('congcutinhgia.txt', 'utf8');
const marker = 'Dữ liệu thô đầy đủ (JSON):';
const jsonStartToken = rawTxt.indexOf('{', rawTxt.indexOf(marker));

if (jsonStartToken === -1) {
  console.error("Marker not found");
  process.exit(1);
}

const headerPart = rawTxt.slice(0, jsonStartToken);
const jsonPart = rawTxt.slice(jsonStartToken);
let data;
try {
  data = JSON.parse(jsonPart);
} catch (e) {
  console.error("JSON parse error", e);
  process.exit(1);
}

const allNewVersion = {
  "id": "VF8-AllNew",
  "modelId": "VF8",
  "name": "Thế hệ mới",
  "basePrice": 999000000,
  "specificPromotions": {},
  "advancedColorPrice": 12000000,
  "depositDiscount": null,
  "bodyInsuranceAmount": null,
  "depositAmount": 50000000,
  "colors": [
    {
      "id": "vc_vf8an_ce18",
      "name": "Trắng (Infinity Blanc)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE18.png",
      "color_code": "CE18",
      "is_advanced": false
    },
    {
      "id": "vc_vf8an_ce11",
      "name": "Đen (Jet Black)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE11.png",
      "color_code": "CE11",
      "is_advanced": false
    },
    {
      "id": "vc_vf8an_ce2q",
      "name": "Đỏ (Solar Ruby)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE2Q.png",
      "color_code": "CE2Q",
      "is_advanced": false
    },
    {
      "id": "vc_vf8an_ce33",
      "name": "Xanh dương (Starburst)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE33.png",
      "color_code": "CE33",
      "is_advanced": false
    },
    {
      "id": "vc_vf8an_1v18",
      "name": "Trắng (Infinity Blanc) + Nóc xám",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/1v18.png",
      "color_code": "1v18",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_2911",
      "name": "Đen (Jet Black) + Nóc đồng",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/2911.png",
      "color_code": "2911",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_2927",
      "name": "Đỏ (Crimson Velvet) + Nóc đồng",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/2927.png",
      "color_code": "2927",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_171v",
      "name": "Xám (Zenith Grey) + Nóc bạc",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/171v.png",
      "color_code": "171v",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_ce32",
      "name": "Cam (Vitality)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE32.png",
      "color_code": "CE32",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_ce2o",
      "name": "Tím (Mysterioso)",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/CE2O.png",
      "color_code": "CE2O",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_112q",
      "name": "Đỏ Solar Ruby + nóc đen",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/112q.png",
      "color_code": "112q",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_1132",
      "name": "Cam Vitality + nóc đen",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/1132.png",
      "color_code": "1132",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_1832",
      "name": "Cam Vitality + nóc trắng",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/1832.png",
      "color_code": "1832",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_1833",
      "name": "Xanh dương Starburst + nóc trắng",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/1833.png",
      "color_code": "1833",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_312o",
      "name": "Tím Mysterioso + nóc bạc",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/312o.png",
      "color_code": "312o",
      "is_advanced": true
    },
    {
      "id": "vc_vf8an_3111",
      "name": "Đen Jet Black + nóc bạc",
      "image": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw29445869/images/VF8/ND31V/3111.png",
      "color_code": "3111",
      "is_advanced": true
    }
  ],
  "promoFlags": {}
};

// Remove if already exists
data.versions = data.versions.filter(v => v.id !== 'VF8-AllNew');
data.versions.push(allNewVersion);

// Sort versions by modelId and id
data.versions.sort((a, b) => a.modelId.localeCompare(b.modelId) || a.id.localeCompare(b.id));

const newJsonPart = JSON.stringify(data, null, 2);

// Re-generate the summary at the top
const modelsSummary = data.models.map(m => m.name);
const versionsSummary = data.versions.map(v => `${v.id}: ${v.basePrice.toLocaleString('en-US')} VND`);
const feesSummary = data.fees;
const promotionsSummary = data.promotions.map(p => `${p.name} (${p.type === 'percentage' ? p.value + '%' : p.value.toLocaleString('en-US') + ' VND'})`);

const newSummary = {
  models: modelsSummary,
  versions: versionsSummary,
  fees: feesSummary,
  promotions: promotionsSummary
};

const finalFileContent = JSON.stringify(newSummary, null, 2) + "\n" + marker + "\n" + newJsonPart;
fs.writeFileSync('congcutinhgia.txt', finalFileContent, 'utf8');
console.log('Successfully added VF8 All New');
