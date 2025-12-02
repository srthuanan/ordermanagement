export const API_URL = "https://script.google.com/macros/s/AKfycbxNGSHVB5ska6T9QltHUyDQNVeHTyfqqOS8saOJB09KlgaIfZqRUJQkaef0_42EsvBSOA/exec";
export const ADMIN_USER = "PHẠM THÀNH NHÂN";

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const versionsMap = {
    "VF 3": ["Base", "Base Tiêu chuẩn 2"],
    "VF 5": ["Plus"],
    "VF 6": ["Eco Tiêu chuẩn", "Eco Nâng cấp", "Plus Tiêu chuẩn", "Plus Nâng cấp", "Plus_US", "Plus Tiêu chuẩn 1", "Plus Tiêu chuẩn 2"],
    "VF 7": ["Eco", "Eco_HUD", "Plus_Metal Nâng cấp", "Plus_Metal Tiêu chuẩn", "Plus Tiêu chuẩn", "Plus Nâng cấp", "Eco Tiêu chuẩn 1", "Eco Tiêu chuẩn 2", "Eco_HUD Tiêu chuẩn 1", "Eco_HUD Tiêu chuẩn 2", "Plus_Metal Tiêu chuẩn 1", "Plus_Metal Tiêu chuẩn 2", "Plus Tiêu chuẩn 2", "Plus Tiêu chuẩn 1", "Plus_Metal Tiêu chuẩn 1 (FWD)", "Plus_Metal Tiêu chuẩn 1 (AWD)"],
    "VF 8": ["Eco Tiêu chuẩn", "Eco Nâng cấp", "Plus"],
    "VF 9": ["Plus_CAP_Metal_3ZONES", "Plus_Metal_3ZONES", "Eco_3ZONES", "Plus_Metal", "Plus_CAP_Metal"],
    "HERIO": ["HERIO"], "NERIO": ["NERIO"], "LIMO": ["LIMO"], "MINIO": ["MINIO"],
    "EC Van": ["EC Van"]
};

export const allPossibleVersions = [
    "Base", "Plus", "Plus Tiêu chuẩn", "Plus Nâng cấp", "Eco", "Eco_HUD", "Eco Tiêu chuẩn", "Eco Nâng cấp",
    "Plus_Metal Tiêu chuẩn", "Plus_Metal Nâng cấp", "Plus_CAP_Metal", "Plus_Metal_3ZONES", "Eco_3ZONES",
    "Plus_CAP_Metal_3ZONES", "HERIO", "NERIO", "LIMO", "MINIO",
    "Plus_US", "Plus Tiêu chuẩn 1", "Plus Tiêu chuẩn 2", "Eco Tiêu chuẩn 1", "Eco Tiêu chuẩn 2",
    "Eco_HUD Tiêu chuẩn 1", "Eco_HUD Tiêu chuẩn 2", "Plus_Metal Tiêu chuẩn 1", "Plus_Metal Tiêu chuẩn 2",
    "Base Tiêu chuẩn 2", "Plus_Metal Tiêu chuẩn 1 (FWD)", "Plus_Metal Tiêu chuẩn 1 (AWD)",
    "EC Van"
];

// --- Color Rules ---

export const defaultExteriors = [
    "Brahminy White (CE18)", "Yellow (CE1U)", "Sunset ORB (CE1A)", "Crimson Red (CE1M)",
    "Vinfast Blue (CE1N)", "Neptune Grey (CE14)", "Jet Black (CE11)", "Electric Blue (CE1J)",
    "Zenith Grey (CE1V)", "Jet Black Roof- Summer Yellow Body (111U)",
    "Brahminy White Roof- Aquatic Azure Body (181Y)", "Brahminy White Roof- Rose Pink Body (1821)",
    "Brahminy White Roof - Iris Berry Body (181X)", "Urbant Mint (CE1W)", "Vinbus Green (CE2B)",
    "Deep Ocean (CE1H)", "Brahminy White Roof- Summer Yellow Body (181U)", "Iris Berry (CE1X)",
    "Zenith Grey-desat Silver Roof (171V)", "Urbant Mint Green - Desat Silv (171W)",
    "Ivy Green-desat Silver Roof (1722)", "Atlantic Blue-Aquatic Azure Ro (1Y26)",
    "Jet Black-Champagne Creme Roof (2311)", "Infinity Blanc _ Silky White R (2418)",
    "Champagne Creme - Matte Champa (2523)", "Jet Black - Graphite Roof (2811)",
    "Crimson Velvet - Mystery Bronz (2927)", "Ivy_Green_GNE (CE22)", "Champagne_Creme_YLG (CE23)",
    "Crimson Red - Jet Black Roof (111M)", "Infinity Blanc_Zenith Grey Roof (1v18)",
    "Deep Ocean_Jet Black Roof (111H)", "Alantic Blue_Denim Blue Roof (2A26)",
    "Jet Black_Mystery Bronze Roof (2911)", "Champagne Creme_Infinity Blanc Roof (1823)",
    "Silver (CE17)"
];

export const defaultInteriors = ["Black", "Brown", "Beige"];

export const interiorColorRules = [
    { models: ["vf 3", "vf 5"], colors: ["Black"] },
    { models: ["vf 6", "vf 7", "vf 8", "vf 9"], versions: ["plus tiêu chuẩn", "plus nâng cấp", "plus", "plus_metal nâng cấp", "plus_metal tiêu chuẩn", "plus_cap_metal_3zones", "plus_metal_3zones", "plus_cap_metal", "plus_metal", "plus_us", "plus tiêu chuẩn 1", "plus tiêu chuẩn 2", "plus_metal tiêu chuẩn 1", "plus_metal tiêu chuẩn 2", "plus_metal tiêu chuẩn 1 (fwd)", "plus_metal tiêu chuẩn 1 (awd)"], colors: ["Black", "Brown", "Beige"] },
    { models: ["vf 6", "vf 7", "vf 8", "vf 9"], versions: ["eco tiêu chuẩn", "eco nâng cấp", "eco", "eco_hud", "eco_3zones", "eco tiêu chuẩn 1", "eco tiêu chuẩn 2", "eco_hud tiêu chuẩn 1", "eco_hud tiêu chuẩn 2"], colors: ["Black"] },
    { models: ["herio", "nerio", "limo", "minio", "ec van"], colors: ["Black"] }
];

export const VALID_IMAGES_BY_MODEL: Record<string, string[]> = {
    "vf3": ["181u", "181y", "1821", "ce18", "ce1j", "ce1m", "ce1v", "ce1w", "ce1x"],
    "vf5": ["111u", "181y", "ce11", "ce14", "ce18", "ce1m", "ce1v", "ce1w", "ce1x"],
    "vf6": ["ce11", "ce14", "ce18", "ce1h", "ce1m", "ce1n", "ce1v", "ce1w"],
    "vf7": ["ce11", "ce14", "ce17", "ce18", "ce1h", "ce1m", "ce1n", "ce1v", "ce1w"],
    "vf8": ["ce11", "ce14", "ce18", "ce1h", "ce1m", "ce1n", "ce1v", "ce1w", "ce22"],
    "vf9": ["ce11", "ce14", "ce17", "ce18", "ce1h", "ce1m", "ce1n", "ce1w", "ce22"],
    "ecvan": ["ce18", "ce1m", "ce1u", "ce1w"],
    "herio": ["ce11", "ce17", "ce1m", "ce1u"],
    "limo": ["ce11", "ce17", "ce18", "ce1m", "ce1u"],
    "nerio": ["ce11", "ce17", "ce1m", "ce1u"],
};