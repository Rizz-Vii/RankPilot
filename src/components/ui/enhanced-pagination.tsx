"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showTotal?: boolean;
  totalItems?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  maxVisiblePages?: number;
  disabled?: boolean;
  showFirstLast?: boolean;
  showQuickJumper?: boolean;
}

export function EnhancedPagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageSize = true,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showTotal = true,
  totalItems,
  className,
  size = "md",
  variant = "default",
  maxVisiblePages = 7,
  disabled = false,
  showFirstLast = true,
  showQuickJumper = false,
}: PaginationProps) {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(currentPage - half, 1);
    const end = Math.min(start + maxVisiblePages - 1, totalPages);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(end - maxVisiblePages + 1, 1);
    }

    const pages = [];

    // Add first page and ellipsis if needed
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push("...");
      }
    }

    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8 text-xs";
      case "lg":
        return "h-12 w-12 text-base";
      default:
        return "h-10 w-10 text-sm";
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case "outline":
        return "outline";
      case "ghost":
        return "ghost";
      default:
        return "default";
    }
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || 0);

  const handleQuickJump = (page: string) => {
    const pageNum = parseInt(page, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        className
      )}
    >
      {/* Page Size Selector and Total Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(_value) => onPageSizeChange(parseInt(_value, 10))}
              disabled={disabled}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
        )}

        {showTotal && totalItems && (
          <div className="hidden sm:block">
            Showing {startItem} to {endItem} of {totalItems} results
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        {showFirstLast && currentPage > 1 && (
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={getSizeClasses()}
            onClick={() => onPageChange(1)}
            disabled={disabled}
            aria-label="Go to first page"
          >
            ««
          </Button>
        )}

        {/* Previous Page */}
        <Button
          variant={getButtonVariant()}
          size="sm"
          className={getSizeClasses()}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === "...") {
              return (
                <div
                  key={`ellipsis-${index}`}
                  className={cn(
                    "flex items-center justify-center",
                    getSizeClasses()
                  )}
                  aria-hidden="true"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              );
            }

            const pageNumber = page as number;
            const isActive = pageNumber === currentPage;

            return (
              <motion.div
                key={pageNumber}
                whileHover={{ scale: disabled ? 1 : 1.05 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
              >
                <Button
                  variant={isActive ? "default" : getButtonVariant()}
                  size="sm"
                  className={cn(
                    getSizeClasses(),
                    isActive && "pointer-events-none"
                  )}
                  onClick={() => onPageChange(pageNumber)}
                  disabled={disabled}
                  aria-label={`Go to page ${pageNumber}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNumber}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          variant={getButtonVariant()}
          size="sm"
          className={getSizeClasses()}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage === totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        {showFirstLast && currentPage < totalPages && (
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={getSizeClasses()}
            onClick={() => onPageChange(totalPages)}
            disabled={disabled}
            aria-label="Go to last page"
          >
            »»
          </Button>
        )}

        {/* Quick Jump */}
        {showQuickJumper && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-muted-foreground">Go to</span>
            <Select onValueChange={handleQuickJump} disabled={disabled}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <SelectItem key={page} value={page.toString()}>
                      {page}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Mobile Total Info */}
      {showTotal && totalItems && (
        <div className="block sm:hidden text-xs text-muted-foreground text-center">
          {startItem}-{endItem} of {totalItems}
        </div>
      )}
    </div>
  );
}

// Simple pagination for basic use cases
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: Pick<
  PaginationProps,
  "currentPage" | "totalPages" | "onPageChange" | "disabled" | "className"
>) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      <div className="flex items-center gap-2 px-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={disabled || currentPage === totalPages}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
