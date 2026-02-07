import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ProductsPagination } from "~/components/products/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  bulkDeleteTables,
  deleteTable,
  getTablesWithPagination,
} from "~/queries/tables.server";

const tablesSearchSchema = z.object({
  search: z.string().optional().default(""),
  page: z.coerce.number().optional().default(1),
});

export const Route = createFileRoute("/admin/tables/")({
  validateSearch: tablesSearchSchema,
  component: TablesPage,
  loaderDeps: ({ search }) => ({ search: search.search, page: search.page }),
  loader: async ({ deps }) => {
    return await getTablesWithPagination({
      data: { search: deps.search, page: deps.page },
    });
  },
});

function TablesPage() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(searchParams.search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(loaderData.tables.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectTable = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteTable({ data: { id } });
      router.invalidate();
      toast.success("Sto je obrisano!");
    } catch (error) {
      toast.error("Greška pri brisanju stola");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      await bulkDeleteTables({ data: { ids: Array.from(selectedIds) } });
      router.invalidate();
      setSelectedIds(new Set());
      toast.success("Stolovi su obrisani!");
    } catch (error) {
      toast.error("Greška pri brisanju stolova");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Stolovi</h1>
          <p className="text-sm text-muted-foreground">
            Upravljajte stolovima i narudžbinama
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/tables/new" })}>
          Dodaj sto
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pretraži po broju stola..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg relative">
        <Table className="compact-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.size === loaderData.tables.length &&
                    loaderData.tables.length > 0
                      ? true
                      : selectedIds.size > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Broj stola</TableHead>
              <TableHead>Kupljeno</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.tables.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  Nema stolova
                </TableCell>
              </TableRow>
            ) : (
              loaderData.tables.map((table) => (
                <TableRow key={table.id} className="hover:bg-muted/50">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(table.id)}
                      onCheckedChange={(checked) =>
                        handleSelectTable(table.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() =>
                      navigate({ to: `/admin/tables/${table.id}` })
                    }
                  >
                    #{table.number}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer text-sm text-muted-foreground"
                    onClick={() =>
                      navigate({ to: `/admin/tables/${table.id}` })
                    }
                  >
                    {(table as any).kupljeno || 0} kom.
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: `/admin/tables/${table.id}` })
                    }
                  >
                    <Badge
                      variant={
                        table.status === "active" ? "default" : "secondary"
                      }
                    >
                      {table.status === "active" ? "Aktivan" : "Neaktivan"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Obriši sto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sigurno želite da obrišete sto #{table.number}? Ovo će
                          obrisati i sve narudžbine za ovaj sto.
                        </AlertDialogDescription>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(table.id)}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Obriši
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Selection overlay */}
        {selectedIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-background border-b flex items-center justify-between px-4 h-[42px]">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={
                  selectedIds.size === loaderData.tables.length &&
                  loaderData.tables.length > 0
                    ? true
                    : selectedIds.size > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-normal">
                {selectedIds.size} sto(a) izabrano
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-6 text-xs"
              >
                Otkaži
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive h-6 text-xs"
                  >
                    Obriši sve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Obriši stolove?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sigurno želite da obrišete {selectedIds.size} sto(a)? Ovo se
                    ne može poništiti.
                  </AlertDialogDescription>
                  <div className="flex justify-end gap-2">
                    <AlertDialogCancel>Otkaži</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Obriši
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        <style>{`
          .compact-table td {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          .compact-table th {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
        `}</style>
      </div>

      {/* Pagination */}
      {loaderData.totalPages > 1 && (
        <div className="mt-6">
          <ProductsPagination
            currentPage={loaderData.currentPage}
            totalPages={loaderData.totalPages}
            total={loaderData.total}
            limit={25}
            itemType="stolova"
            onPageChange={(page) =>
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, page }),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
