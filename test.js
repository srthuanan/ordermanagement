import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    const tr = 'N31999-VS0-25-09-9999'; // Assuming this is the order number from the screenshot
    const { data: o, error: err1 } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', tr);
    console.log('donhang count:', o?.length, err1);

    if (o && o[0]) {
        const vin = o[0].vin;
        const { data: k, error: err2 } = await supabaseAdmin.from('khoxe').select('vin').eq('vin', vin);
        console.log('khoxe count:', k?.length, err2);
        
        const { data: m, error: err3 } = await supabaseAdmin.from('thongtinxe').select('*').eq('vin', vin);
        console.log('thongtinxe count:', m?.length, err3);
    }
}
test();
