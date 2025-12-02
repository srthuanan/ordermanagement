import React from 'react';
import Button from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  isLoadingArchives: boolean;
  isLastArchive: boolean;
}

/**
 * Một component phân trang với phong cách phẳng, nhỏ gọn, không có nền.
 * Hiển thị các nút số, nút điều hướng và nút "Tải thêm" khi cần thiết.
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  isLoadingArchives,
  isLastArchive
}) => {
  // Nếu chỉ có 1 trang (hoặc 0 trang) VÀ không còn lưu trữ, không hiển thị gì cả.
  if (totalPages <= 1 && isLastArchive) return null;

  // --- LOGIC TÍNH TOÁN SỐ TRANG ---
  const pageNumbers = [];
  const maxPagesToShow = 3; // Chỉ hiển thị 3 số một lúc cho gọn
  let startPage: number, endPage: number;

  if (totalPages <= maxPagesToShow) {
    startPage = 1;
    endPage = totalPages;
  } else {
    if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
      startPage = 1;
      endPage = maxPagesToShow;
    } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
      startPage = totalPages - maxPagesToShow + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxPagesToShow / 2);
      endPage = currentPage + Math.floor(maxPagesToShow / 2);
    }
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  // --- KẾT THÚC LOGIC SỐ TRANG ---

  // --- CÁC LỚP CSS NHỎ GỌN (KHÔNG NỀN) ---
  const baseButtonClass = "flex items-center justify-center text-xs font-medium rounded-md transition-colors duration-200";
  // Lớp CSS cho nút điều hướng (mũi tên) - Nhỏ hơn
  const arrowButtonClass = `${baseButtonClass} w-7 h-7 text-gray-500 hover:bg-gray-100 hover:text-gray-700`;
  // Lớp CSS cho nút số (trạng thái bình thường) - Nhỏ hơn
  const numberButtonClass = `${baseButtonClass} w-7 h-7 text-gray-500 hover:bg-gray-50 hover:text-gray-700`;
  // Lớp CSS cho nút số (trạng thái active) - "Gradient xanh nhạt"
  const activeNumberClass = `${baseButtonClass} w-7 h-7 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-semibold shadow-sm hover:from-blue-500 hover:to-blue-600`;
  // Lớp CSS cho nút "Tải thêm" - Nhỏ hơn
  const loadMoreButtonClass = `${baseButtonClass} px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold`;
  // Lớp CSS cho trạng thái bị vô hiệu hóa
  const disabledClass = "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500";
  // Lớp CSS cho dấu "..." - Nhỏ hơn
  const ellipsisClass = "w-7 h-7 flex items-center justify-center text-sm font-medium text-gray-400";

  // Biến cờ kiểm tra khi nào hiển thị nút "Tải thêm"
  const showLoadMore = (totalPages === 0 || currentPage === totalPages) && !isLastArchive;

  return (
    <nav className="px-4 py-2 flex items-center justify-center space-x-0.5 flex-wrap gap-y-1">

      {/* Nút 'Trước' */}
      {totalPages > 1 && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${arrowButtonClass} ${disabledClass}`}
          aria-label="Trang trước"
        >
          {/* Icon nhỏ hơn */}
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
      )}

      {/* Dấu '...' và số 1 (nếu cần) */}
      {totalPages > 1 && startPage > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={numberButtonClass}>1</button>
          {startPage > 2 && <span className={ellipsisClass}>...</span>}
          <Button onClick={() => onPageChange(1)} variant={currentPage === 1 ? 'primary' : 'ghost'} className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors !p-0 ${currentPage === 1 ? '' : 'hover:bg-surface-hover'}`}>1</Button>
          {startPage > 2 && (
            <Button
              disabled
              variant="ghost"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary !p-0"
            >
              ...
            </Button>
          )}
        </>
      )}

      {/* Các số trang */}
      {totalPages > 1 && pageNumbers.map(number => (
        <Button
          key={number}
          onClick={() => onPageChange(number)}
          variant={currentPage === number ? 'primary' : 'ghost'}
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors !p-0 ${currentPage === number ? '' : 'hover:bg-surface-hover'}`}
        >
          {number}
        </Button>
      ))}

      {/* Dấu '...' và số cuối (nếu cần) */}
      {totalPages > 1 && endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <Button
              disabled
              variant="ghost"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary !p-0"
            >
              ...
            </Button>
          )}
          <Button onClick={() => onPageChange(totalPages)} variant={currentPage === totalPages ? 'primary' : 'ghost'} className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors !p-0 ${currentPage === totalPages ? '' : 'hover:bg-surface-hover'}`}>{totalPages}</Button>
        </>
      )}

      {/* Nút 'Sau' */}
      {totalPages > 1 && (
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="ghost"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors !p-0"
          aria-label="Trang sau"
        >
          {/* Icon nhỏ hơn */}
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </Button>
      )}

      {/* Nút Tải thêm từ Lưu trữ */}
      {showLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingArchives}
          className={`${loadMoreButtonClass} ${disabledClass} ml-2`} // Thêm chút lề
        >
          {isLoadingArchives
            ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải...</>
            : <><i className="fas fa-archive mr-2"></i> Tải thêm</>
          }
        </button>
      )}
    </nav>
  );
};

export default Pagination;