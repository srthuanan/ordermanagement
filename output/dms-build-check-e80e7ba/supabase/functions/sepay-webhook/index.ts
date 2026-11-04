import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interface for SePay Webhook Payload
interface SePayPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  referenceCode: string;
  description: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const payload: SePayPayload = await req.json();

    // Only process incoming transfers
    if (payload.transferType !== 'in') {
      return new Response(JSON.stringify({ success: true, message: 'Not an incoming transfer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = ((payload.content || payload.description || '') + '').toUpperCase();
    const amount = Number(payload.transferAmount || 0);

    console.log(`Received payment: ${amount} VND. Content: ${content}`);

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // CASE 1: Check if it's CRM Lead Import payment
    // E.g., NAPCRM QUAN.ND 61K or SEVQR NAPCRM NGUYENVANNHA 61K
    const crmMatch = content.match(/(?:SEVQR\s*)?(?:NAPCRM|CRM)\s*([A-Z0-9_.]+)(?:\s*(\d+)K?)?/i);
    if (crmMatch) {
      const rawUser = crmMatch[1];
      const leadCount = crmMatch[2] ? parseInt(crmMatch[2]) : 61;
      console.log(`Processing CRM lead payment for ${rawUser}, leadCount: ${leadCount}, amount: ${amount}`);

      // Find pending order for this user (or create a paid order)
      const { data: pendingOrders } = await supabase
        .from('crm_lead_orders')
        .select('*')
        .eq('status', 'pending')
        .ilike('ten_tvbh', `%${rawUser}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pendingOrders && pendingOrders.length > 0) {
        const order = pendingOrders[0];
        await supabase
          .from('crm_lead_orders')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            amount: amount,
            sepay_transaction_id: String(payload.id || payload.referenceCode || '')
          })
          .eq('id', order.id);
        console.log(`Updated pending CRM order ${order.id} to paid`);
      } else {
        // Insert a new paid order directly
        await supabase
          .from('crm_lead_orders')
          .insert({
            ten_tvbh: rawUser,
            lead_count: leadCount,
            amount: amount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            sepay_transaction_id: String(payload.id || payload.referenceCode || '')
          });
        console.log(`Created new paid CRM order for ${rawUser}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'CRM Lead Payment processed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CASE 2: Parse the content: (optional SEVQR) WEB T{month} {username}
    // E.g., SEVQR WEB T5 NGUYENVANNHA
    const match = content.match(/(?:SEVQR\s*)?WEB\s*T(\d+)\s*([A-Z0-9_]+)/i);

    if (!match) {
      console.log('Payment content does not match the expected pattern.');
      return new Response(JSON.stringify({ success: true, message: 'Unrecognized payment content' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const month = parseInt(match[1]);
    const username = match[2];

    // Fetch all pending fees for the month
    const { data: pendingFees, error: fetchError } = await supabase
      .from('tvbh_maintenance_fees')
      .select('*')
      .eq('month', month)
      .eq('status', 'pending');

    if (fetchError || !pendingFees || pendingFees.length === 0) {
      console.log(`No pending fees found for month ${month}. Error:`, fetchError);
      return new Response(JSON.stringify({ success: true, message: 'No matching pending fee found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Function to remove accents (diacritics) and spaces
    const normalizeName = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, "").toUpperCase();
    };

    // Find the matching fee
    const feeData = pendingFees.find(fee => normalizeName(fee.ten_tvbh) === username);

    if (!feeData) {
      console.log(`No pending fee found for user matching ${username} and month ${month}.`);
      return new Response(JSON.stringify({ success: true, message: 'No matching pending fee found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify amount
    if (amount < feeData.amount) {
      console.log(`Insufficient amount. Expected ${feeData.amount}, got ${amount}`);
      // Optionally, you can handle partial payments here, but for now we require full payment
      return new Response(JSON.stringify({ success: true, message: 'Insufficient amount' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the fee status to paid
    const { error: updateError } = await supabase
      .from('tvbh_maintenance_fees')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: feeData.amount + 0.5 // Flag as auto-paid via webhook
      })
      .eq('id', feeData.id);

    if (updateError) {
      console.error('Error updating fee status:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated fee status to paid for ${username} (Month ${month})`);

    return new Response(
      JSON.stringify({ success: true, message: 'Payment processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
