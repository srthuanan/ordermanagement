import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Chống SSRF: Ngăn chặn tấn công vào mạng nội bộ hoặc localhost
function isBlockedTarget(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("169.254.") || // AWS/Cloud Metadata IP
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      (hostname.startsWith("172.") && parseInt(hostname.split(".")[1] || "0", 10) >= 16 && parseInt(hostname.split(".")[1] || "0", 10) <= 31)
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url).searchParams.get('url');
    if (!url) {
      return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
    }

    if (isBlockedTarget(url)) {
      return new Response(JSON.stringify({ error: "Access to private or local network is forbidden" }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const response = await fetch(url);
    
    // Copy the response headers but ensure CORS is allowed
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
