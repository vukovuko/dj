import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ProductsPagination } from "~/components/products/pagination";
import { ProductsTable } from "~/components/products/products-table";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  bulkDeleteProducts,
  bulkDraftProducts,
  getProductsWithPagination,
  toggleProductStatus,
} from "~/queries/products.server";

// ========== ROUTE ==========

const productsSearchSchema = z.object({
  search: z.string().optional().default(""),
  page: z.coerce.number().optional().default(1),
});

export const Route = createFileRoute("/admin/products/")({
  validateSearch: productsSearchSchema,
  component: ProductsPage,
  loaderDeps: ({ search }) => ({ search: search.search, page: search.page }),
  loader: async ({ deps }) => {
    return await getProductsWithPagination({
      data: {
        search: deps.search,
        page: deps.page,
      },
    });
  },
});

// ========== COMPONENT ==========

function ProductsPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = Route.useSearch();
  const loaderData = Route.useLoaderData();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(searchParams.search);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchParams.page]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.search) {
        navigate({
          to: ".",
          search: (prev) => ({ ...prev, search: searchInput, page: 1 }),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, navigate, searchParams.search]);

  const handlePageChange = (page: number) => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, page }),
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await bulkDeleteProducts({
        data: { ids: Array.from(selectedIds) },
      });

      toast.success(`Uspešno obrisano ${result.count} proizvod(a)`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      router.invalidate();
    } catch (error) {
      toast.error("Greška pri brisanju proizvoda");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDraftSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await bulkDraftProducts({
        data: { ids: Array.from(selectedIds) },
      });

      toast.success(`Uspešno draftovano ${result.count} proizvod(a)`);
      setSelectedIds(new Set());
      router.invalidate();
    } catch (error) {
      toast.error("Greška pri draftovanju proizvoda");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const product = loaderData.products.find((p) => p.id === id);
      const newStatus = product?.status === "active" ? "draft" : "active";

      await toggleProductStatus({ data: { id } });

      toast.success(
        newStatus === "draft"
          ? "Proizvod je prebačen u draft"
          : "Proizvod je aktiviran",
      );

      router.invalidate();
    } catch (error) {
      toast.error("Greška pri promeni statusa");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(loaderData.products.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Proizvodi</h1>
          <p className="text-sm text-muted-foreground">
            Upravljajte proizvodima i cenama
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/products/new" })}>
          Dodaj proizvod
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pretraži proizvode..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <ProductsTable
        products={loaderData.products}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onToggleStatus={handleToggleStatus}
        onBulkDelete={handleDeleteSelected}
        onBulkDraft={handleDraftSelected}
      />

      {/* Pagination */}
      {loaderData.totalPages > 1 && (
        <div className="mt-6">
          <ProductsPagination
            currentPage={loaderData.currentPage}
            totalPages={loaderData.totalPages}
            total={loaderData.total}
            limit={25}
            itemType="proizvoda"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši proizvode</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete {selectedIds.size}{" "}
              proizvod(a)? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
