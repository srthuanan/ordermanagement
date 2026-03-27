import { supabase } from '../supabaseClient';

export interface Policy {
  id?: number; 
  ten_chinh_sach: string;
  trang_thai: string;
  han_su_dung?: string;
  dong_xe?: string;
}

export const normalizePolicyName = (name: string) => {
    if (!name) return "";
    let n = name.trim().toLowerCase();
    const prefixes = ["chính sách ưu đãi", "chính sách", "ưu đãi", "chương trình", "tặng", "quà tặng"];
    for (const p of prefixes) {
        if (n.startsWith(p)) {
            n = n.substring(p.length).trim();
        }
    }
    
    // Loại bỏ từ nối phổ biến (stop words)
    const stopWords = ["vào", "cho", "của", "tại", "theo"];
    let words = n.split(/\s+/);
    words = words.filter(w => !stopWords.includes(w));
    n = words.join(" ");

    // Loại bỏ các ký tự đặc biệt như ( ), %, - để so sánh chính xác hơn
    return n.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

export const policyAdminService = {
  getAllPolicies: async (): Promise<{ status: string; data?: Policy[]; message?: string }> => {
    try {
      const { data, error } = await supabase
        .from('chinhsach')
        .select('*')
        .order('ten_chinh_sach', { ascending: true });

      if (error) throw error;
      return { status: 'SUCCESS', data };
    } catch (error: any) {
      console.error('Error fetching policies:', error);
      return { status: 'ERROR', message: error.message };
    }
  },

  upsertPolicy: async (policy: Policy): Promise<{ status: string; message: string }> => {
    try {
        const payload: any = { 
            ten_chinh_sach: policy.ten_chinh_sach.trim(),
            trang_thai: policy.trang_thai,
            han_su_dung: policy.han_su_dung ?? null,
            dong_xe: policy.dong_xe ?? null,
        };

        if (policy.id) {
            // === CHỈNH SỬA: Update theo id để cho phép đổi tên ===
            const { error: updateError } = await supabase
                .from('chinhsach')
                .update(payload)
                .eq('id', policy.id);

            if (updateError) throw updateError;
            return { status: 'SUCCESS', message: 'Đã cập nhật chính sách thành công' };
        } else {
            // === TẠO MỚI: Kiểm tra trùng tên (fuzzy matching) trước khi insert ===
            const { data: allPolicies } = await supabase
                .from('chinhsach')
                .select('id, ten_chinh_sach');

            const payloadNorm = normalizePolicyName(payload.ten_chinh_sach);
            const existingData = allPolicies?.find(p => 
                normalizePolicyName(p.ten_chinh_sach) === payloadNorm
            );

            if (existingData) {
                // Tên đã tồn tại (fuzzy match) -> update theo id đó
                const { error: updateError } = await supabase
                    .from('chinhsach')
                    .update(payload)
                    .eq('id', existingData.id);

                if (updateError) throw updateError;
                return { status: 'SUCCESS', message: 'Đã cập nhật chính sách thành công (fuzzy match)' };
            } else {
                const { error: insertError } = await supabase
                    .from('chinhsach')
                    .insert([payload]);

                if (insertError) throw insertError;
                return { status: 'SUCCESS', message: 'Đã thêm chính sách mới thành công' };
            }
        }
    } catch (error: any) {
      console.error('Error upserting policy:', error);
      return { status: 'ERROR', message: error.message };
    }
  },

  deletePolicy: async (ten_chinh_sach: string): Promise<{ status: string; message: string }> => {
    try {
      const { error } = await supabase
        .from('chinhsach')
        .delete()
        .eq('ten_chinh_sach', ten_chinh_sach);

      if (error) throw error;
      return { status: 'SUCCESS', message: 'Đã xóa chính sách thành công' };
    } catch (error: any) {
      console.error('Error deleting policy:', error);
      return { status: 'ERROR', message: error.message };
    }
  }
};
