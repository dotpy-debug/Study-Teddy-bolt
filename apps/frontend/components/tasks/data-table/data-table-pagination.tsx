'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = pageIndex + 1; // Convert from 0-based to 1-based
  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex < totalPages - 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      onPageChange(newPage);
    }
  };

  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages = [];
    const start = Math.max(0, pageIndex - delta);
    const end = Math.min(totalPages - 1, pageIndex + delta);

    // Add first page if not in range
    if (start > 0) {
      pages.push(0);
      if (start > 1) {
        pages.push(-1); // Ellipsis marker
      }
    }

    // Add pages in range
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add last page if not in range
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        pages.push(-1); // Ellipsis marker
      }
      pages.push(totalPages - 1);
    }

    return pages;
  };

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          No items to display
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between space-x-6 lg:space-x-8">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Rows per page</p>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex w-[120px] items-center justify-center text-sm font-medium">
          {startItem}-{endItem} of {totalCount}
        </div>

        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {getPageNumbers().map((page, index) => {
              if (page === -1) {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              const isCurrentPage = page === pageIndex;
              return (
                <Button
                  key={page}
                  variant={isCurrentPage ? "default" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                  aria-label={`Go to page ${page + 1}`}
                  aria-current={isCurrentPage ? "page" : undefined}
                >
                  {page + 1}
                </Button>
              );
            })}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canGoNext || isLoading}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={!canGoNext || isLoading}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}