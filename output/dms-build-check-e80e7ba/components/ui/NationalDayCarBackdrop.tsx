import React from 'react';

const VIETNAM_FLAG_DOTLOTTIE_URL = 'https://lottie.host/cc1ed841-fc96-4d6d-81d6-e4477d884647/DFGLGjOpSw.lottie';

/**
 * Hiệu ứng Lá Cờ Việt Nam DotLottie Nằm Xéo Góc Trên Bên Trái
 * Đặt ở lớp Z-Index 25 để NẰM TRÊN LỚP HIỆU ỨNG THỜI TIẾT (Weather Canvas z-20)
 * Trụ cờ được nối dài khớp chính xác cắm xuống mặt sàn
 */
export const NationalDayCarBackdrop: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden select-none">
      {/* Cụm Cờ & Trụ cờ đồng nhất 100% (Nằm trên lớp thời tiết) */}
      <div className="absolute -top-4 -left-6 md:-top-2 md:left-2 w-[340px] md:w-[420px] h-[260px] md:h-[320px] flex items-center justify-center transform -rotate-6 md:-rotate-8 opacity-100 transition-all duration-700">
        <dotlottie-player
          src={VIETNAM_FLAG_DOTLOTTIE_URL}
          background="transparent"
          speed="1"
          style={{ 
            width: '100%', 
            height: '100%',
            filter: 'saturate(1.65) contrast(1.25) brightness(0.92) drop-shadow(0 4px 10px rgba(0,0,0,0.15))'
          }}
          loop
          autoplay
        />

        {/* Trụ cờ đen đồng bộ khớp chính xác vào đáy cột cờ animation */}
        <div 
          className="absolute top-[68%] left-[11.2%] md:left-[11.2%] w-[3.5px] md:w-[4px] h-[160px] md:h-[210px] bg-[#27272a] rounded-b-[1px] shadow-sm z-10"
        >
          {/* Chân đế kim loại cắm sàn */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 md:w-5 h-1.5 rounded-[100%] bg-[#18181b] shadow-md" />
          
          {/* Bóng đổ tiếp xúc mặt sàn */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 md:w-8 h-2 rounded-[100%] bg-slate-950/30 blur-[2px]" />
        </div>
      </div>
    </div>
  );
};

export default NationalDayCarBackdrop;
