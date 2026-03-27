import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "vinfast_cleanup_secure"; // Bạn có thể đổi secret này trong Dashboard Supabase

Deno.serve(async (req: Request) => {
  // 1. Kiểm tra xác thực qua URL hoặc Header (để cron-job.org có thể gọi an toàn)
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");
  const secretHeader = req.headers.get("x-cron-secret");

  if (secretParam !== CRON_SECRET && secretHeader !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized access detected." }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // 2. Tạo Client với Service Role để có quyền chạy các SP/RPC hệ thống
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- Bắt đầu tiến trình dọn dẹp hệ thống tự động ---");
    
    // 3. Gọi RPC Master Cleanup đã viết ở Migration SQL
    const { data, error } = await supabase.rpc('auto_cleanup_system');

    if (error) {
      console.error("Lỗi khi chạy auto_cleanup_system:", error.message);
      throw error;
    }

    console.log("Kết quả dọn dẹp:", data);
    console.log("--- Hoàn tất dọn dẹp ---");

    return new Response(JSON.stringify({ 
      message: "Cleanup completed successfully", 
      result: data 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("Lỗi thực thi Function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});
