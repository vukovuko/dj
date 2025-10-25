import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination"

interface ProductsPaginationProps {
  currentPage: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function ProductsPagination({ currentPage, totalPages, total, onPageChange }: ProductsPaginationProps) {
  const startItem = (currentPage - 1) * 50 + 1
  const endItem = Math.min(currentPage * 50, total)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2 // Number of pages to show on each side of current page
    const range: (number | "ellipsis")[] = []
    const left = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)

    // Always show first page
    range.push(1)

    // Show ellipsis if there's a gap
    if (left > 2) {
      range.push("ellipsis")
    }

    // Show pages around current page
    for (let i = left; i <= right; i++) {
      range.push(i)
    }

    // Show ellipsis if there's a gap
    if (right < totalPages - 1) {
      range.push("ellipsis")
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      range.push(totalPages)
    }

    return range
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        Prikazuje {startItem}-{endItem} od {total} proizvoda
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum, index) => (
            <PaginationItem key={index}>
              {pageNum === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
