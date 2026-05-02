import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const secrets = {
    GEMINI_API_KEYS: Deno.env.get("GEMINI_API_KEYS") || Deno.env.get("GEMINI_API_KEY"),
    GITHUB_TOKEN: Deno.env.get("GITHUB_TOKEN"),
    OPENROUTER_KEY: Deno.env.get("OPENROUTER_KEY"),
    GROQ_KEY: Deno.env.get("GROQ_KEY"),
    DEEPSEEK_KEY: Deno.env.get("DEEPSEEK_KEY")
  };
  
  return new Response(JSON.stringify(secrets), {
    headers: { "Content-Type": "application/json" }
  });
})
