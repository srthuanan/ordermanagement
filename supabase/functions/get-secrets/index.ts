import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (_req) => {
  return new Response(JSON.stringify({ message: "Service is active and protected." }), {
    headers: { "Content-Type": "application/json" }
  });
});
