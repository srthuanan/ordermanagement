import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Edge Function này đã bị vô hiệu hóa để bảo vệ an toàn các API Key của hệ thống
serve(async (_req) => {
  return new Response(JSON.stringify({ error: "Endpoint disabled for security reasons." }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
});
