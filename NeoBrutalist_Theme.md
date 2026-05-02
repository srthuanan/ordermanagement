# SEAMLESS NEO-BRUTALISM (Integrated Dashboard Style)

Tài liệu này chứa mã nguồn cho phiên bản Neo-Brutalism "Nguyên khối & Liền mạch" cuối cùng.

---

## 1. CSS Configuration (index.css)

```css
:root {
  --bg-main: #fefce8; /* Nền vàng nhạt Pop Art */
  --accent-primary: #000000;
  --brutal-border: 4px solid #000000;
  --brutal-shadow: 8px 8px 0px #000000;
}

/* Hiệu ứng nền Dot Grid */
.mesh-bg {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: -1;
  background-color: var(--bg-main);
  background-image: radial-gradient(#000000 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.05;
}

/* Container chính bao bọc toàn bộ App */
.brutal-card {
  background: #ffffff;
  border: var(--brutal-border);
  box-shadow: var(--brutal-shadow);
  overflow: hidden;
}
```

---

## 2. Integrated Dashboard (StockView.tsx)

Toàn bộ Header, Search và Grid được ghép nối không có kẽ hở.

```tsx
/* Master Container Layout */
<div className="brutal-card bg-white flex flex-col overflow-hidden">
  
  {/* Row 1: Header & Stats */}
  <div className="flex flex-col lg:flex-row items-stretch border-b-4 border-black">
    <div className="p-8 flex-1">
      <h1 className="text-4xl font-black uppercase italic">
        VinFast <span className="text-pink-500">Stock</span>
      </h1>
    </div>
    <div className="flex border-t-4 lg:border-t-0 lg:border-l-4 border-black">
       <div className="p-6 bg-cyan-400 min-w-[140px] border-black">
          {/* Total Stats */}
       </div>
       <div className="p-6 bg-lime-400 border-l-4 border-black min-w-[140px]">
          {/* Available Stats */}
       </div>
    </div>
  </div>

  {/* Row 2: Seamless Search & Filters */}
  <div className="flex flex-col md:flex-row items-stretch border-b-4 border-black bg-yellow-400">
    <div className="relative flex-1 border-r-4 border-black">
      <input className="w-full pl-12 py-5 bg-transparent font-black" />
    </div>
    <div className="flex-1 flex px-4 gap-2 bg-white md:bg-transparent overflow-x-auto">
      {/* Model Filter Buttons */}
    </div>
  </div>

  {/* Row 3: Gapless Grid */}
  <div className="bg-black"> {/* Màu đen làm đường viền giữa các ô */}
    <div className="grid grid-cols-2 md:grid-cols-6 gap-[4px]">
      {/* StockCards fit perfectly here */}
    </div>
  </div>
</div>
```

---

## 3. Checkerboard Card Design (StockCard.tsx)

Thẻ xe được thiết kế tối giản để khớp vào lưới.

```tsx
<motion.div className="relative flex flex-col bg-white h-full group">
  {/* Ảnh xe với viền dưới mảnh hơn */}
  <div className="relative h-28 overflow-hidden border-b-2 border-black">
     <img className="group-hover:scale-105 transition-all" />
     <div className="absolute top-0 right-0 border-l-2 border-b-2 border-black px-2 py-1 font-black text-[7px]">
       {status}
     </div>
  </div>

  <div className="p-3 flex flex-col flex-1 gap-2">
    {/* Model Name with Pop Art underline */}
    <h3 className="text-xs font-black uppercase underline decoration-yellow-400 decoration-2">
      {model}
    </h3>
    
    {/* Action Button with Hard Offset Shadow */}
    <button className="w-full bg-lime-400 border-2 border-black font-black text-[8px] py-2 shadow-[2px_2px_0px_#000000]">
      GIỮ XE
    </button>
  </div>
</motion.div>
```

---

## 4. Why it works (Seamless Logic)

1.  **Zero Gaps**: Bằng cách sử dụng `gap-[4px]` trên nền `bg-black`, các thẻ xe (`bg-white`) tự động tạo ra các đường viền ngăn cách đồng nhất, tạo cảm giác liền mạch tuyệt đối.
2.  **Shared Borders**: Các thành phần trong Header dùng chung đường viền với nhau (`border-l-4`, `border-t-4`), loại bỏ sự rời rạc.
3.  **Consistent Palette**: Việc sử dụng các mảng màu lớn (Cyan cho kho, Lime cho hành động, Pink cho làm mới) giúp người dùng phân loại chức năng bằng màu sắc một cách trực giác.
