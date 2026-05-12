const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const projectRef = 'jwvgxqrkjlbewvpkvucj';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function executeSql(sql) {
    try {
        const response = await axios.post(
            `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
            { query: sql },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

const sql = `
ALTER TABLE public.archived_orders ADD COLUMN IF NOT EXISTS xe_xang_vin TEXT;
ALTER TABLE public.archived_orders ADD COLUMN IF NOT EXISTS xe_xang_hang TEXT;
ALTER TABLE public.archived_orders ADD COLUMN IF NOT EXISTS xe_xang_model TEXT;
`;

executeSql(sql);
