import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  isLoadingArchives: boolean;
  isLastArchive: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, onLoadMore, isLoadingArchives, isLastArchive }) => {
  if (totalPages <= 1 && isLastArchive) return null;

  const pageNumbers = [];
  const maxPagesToShow = 5;
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
  
  const baseButtonClass = "px-3 py-1 text-sm rounded-md border transition-colors duration-200";
  const defaultButtonClass = "border-border-primary bg-surface-card text-text-secondary hover:bg-surface-hover hover:border-border-secondary";
  const activeButtonClass = "bg-accent-primary text-white border-accent-primary";
  const disabledButtonClass = "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-input";

  return (
    <nav className="mt-4 px-4 py-3 flex items-center justify-center space-x-2 flex-wrap gap-y-2 border-t border-border-primary">
      {totalPages > 1 && (
        <>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${baseButtonClass} ${defaultButtonClass} ${disabledButtonClass}`}
            >
                &laquo; Trước
            </button>

            {startPage > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className={`${baseButtonClass} ${defaultButtonClass}`}>1</button>
                    {startPage > 2 && <span className="px-2 py-1 text-sm text-text-secondary">...</span>}
                </>
            )}

            {pageNumbers.map(number => (
                <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`${baseButtonClass} ${currentPage === number ? activeButtonClass : defaultButtonClass}`}
                >
                {number}
                </button>
            ))}
            
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="px-2 py-1 text-sm text-text-secondary">...</span>}
                    <button onClick={() => onPageChange(totalPages)} className={`${baseButtonClass} ${defaultButtonClass}`}>{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`${baseButtonClass} ${defaultButtonClass} ${disabledButtonClass}`}
            >
                Sau &raquo;
            </button>
        </>
      )}

      {(totalPages === 0 || currentPage === totalPages) && !isLastArchive && (
        <button
            onClick={onLoadMore}
            disabled={isLoadingArchives}
            className="ml-4 px-4 py-2 text-sm rounded-md border-accent-primary border text-accent-primary font-semibold hover:bg-surface-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoadingArchives 
                ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải...</>
                : <><i className="fas fa-archive mr-2"></i> Tải thêm từ Lưu trữ</>
            }
        </button>
      )}
    </nav>
  );
};

export default Pagination;