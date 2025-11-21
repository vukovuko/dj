import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { NumberInput } from "~/components/ui/number-input";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { TablePageHeader } from "~/components/tables/table-page-header";
import { toast } from "sonner";
import { Trash2, Plus, Search, MoreVertical } from "lucide-react";
import {
  getTableById,
  updateTable,
  deleteTable,
  addProductToTable,
  updateOrderQuantity,
  toggleOrderPaymentStatus,
  bulkToggleOrderPaymentStatus,
  deleteTableOrder,
  clearTableOrders,
  getActiveProducts,
} from "~/queries/tables.server";

export const Route = createFileRoute("/admin/tables/$id")({
  component: TableDetailPage,
  loader: async ({ params }) => {
    return await getTableById({ data: { id: params.id } });
  },
});

function TableDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();

  const [table, setTable] = useState(loaderData.table);
  const [orders, setOrders] = useState(loaderData.orders);

  const [isEditingTable, setIsEditingTable] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [tableFormData, setTableFormData] = useState({
    number: Number(table.number),
    status: table.status,
  });
  const [tableFormErrors, setTableFormErrors] = useState<Record<string, string>>({});

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState<number | undefined>(1);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteTableDialog, setShowDeleteTableDialog] = useState(false);
  const [showClearOrdersDialog, setShowClearOrdersDialog] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Search products
  useEffect(() => {
    // Don't search if a product is already selected
    if (selectedProductId) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      // Show all products when focused but empty, or search when there's input
      if (isSearchFocused || searchInput.length > 0) {
        try {
          const results = await getActiveProducts({
            data: { search: searchInput },
          });
          setSearchResults(results);
        } catch (error) {
          console.error(error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, selectedProductId, isSearchFocused]);

  const handleUpdateTable = async () => {
    try {
      setIsLoadingTable(true);
      setTableFormErrors({});
      const updated = await updateTable({
        data: {
          id,
          number: tableFormData.number,
          status: tableFormData.status as "active" | "inactive",
        },
      });
      setTable(updated);
      setIsEditingTable(false);
      toast.success("Sto je ažuriran!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Greška pri ažuriranju stola";

      if (message.includes("već postoji")) {
        setTableFormErrors({ number: message });
      } else {
        toast.error(message);
      }
      console.error(error);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleDeleteTable = async () => {
    try {
      setIsLoadingTable(true);
      await deleteTable({ data: { id } });
      toast.success("Sto je obrisan!");
      setShowDeleteTableDialog(false);
      navigate({ to: "/admin/tables" });
    } catch (error) {
      console.error(error);
      toast.error("Greška pri brisanju stola");
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) {
      toast.error("Izaberite proizvod");
      return;
    }

    try {
      setIsAddingProduct(true);
      await addProductToTable({
        data: {
          tableId: id,
          productId: selectedProductId,
          quantity: Number(productQuantity),
        },
      });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);

      setSearchInput("");
      setSelectedProductId("");
      setProductQuantity(1);
      toast.success("Proizvod je dodat!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri dodavanju proizvoda");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleUpdateQuantity = async (orderId: string, newQuantity: number) => {
    try {
      await updateOrderQuantity({
        data: { orderId, quantity: newQuantity },
      });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      toast.success("Količina je ažurirana!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri ažuriranju količine");
    }
  };

  const handleTogglePaymentStatus = async (
    orderId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
      await toggleOrderPaymentStatus({
        data: { orderId, status: newStatus as "paid" | "unpaid" },
      });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      toast.success("Status je ažuriran!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri ažuriranju statusa");
    }
  };

  const handleBulkTogglePaymentStatus = async (status: "paid" | "unpaid") => {
    try {
      setIsDeleting(true);
      await bulkToggleOrderPaymentStatus({
        data: { orderIds: Array.from(selectedOrderIds), status },
      });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      setSelectedOrderIds(new Set());
      toast.success("Status je ažuriran!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri ažuriranju statusa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setIsDeleting(true);
      await deleteTableOrder({ data: { orderId } });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      setDeleteOrderId(null);
      toast.success("Stavka je obrisana!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri brisanju stavke");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllOrders = async () => {
    try {
      setIsDeleting(true);
      await clearTableOrders({ data: { tableId: id } });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      setSelectedOrderIds(new Set());
      setShowClearOrdersDialog(false);
      toast.success("Sve narudžbine su obrisane!");
    } catch (error) {
      console.error(error);
      toast.error("Greška pri brisanju narudžbina");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleSelectOrder = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedOrderIds(newSelected);
  };

  const handleMarkAllAs = async (status: "paid" | "unpaid") => {
    try {
      setIsDeleting(true);
      const allOrderIds = orders.map((o) => o.id);
      await bulkToggleOrderPaymentStatus({
        data: { orderIds: allOrderIds, status },
      });
      // Refetch and update local state
      const updated = await getTableById({ data: { id } });
      setOrders(updated.orders);
      toast.success(
        status === "paid"
          ? "Sve stavke označene kao plaćene!"
          : "Sve stavke označene kao neplaćene!",
      );
    } catch (error) {
      console.error(error);
      toast.error("Greška pri označavanju stavki");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedProduct = searchResults.find((p) => p.id === selectedProductId);

  return (
    <div className="container mx-auto p-6 max-w-3xl relative">
      <div className="flex items-center justify-between mb-6">
        <TablePageHeader
          title={`Sto #${table.number}`}
          onBack={() => navigate({ to: "/admin/tables" })}
        />

        {/* Floating delete button - mobile only */}
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setShowDeleteTableDialog(true)}
          className="md:hidden h-9 w-9 rounded-full"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Product Section */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Dodaj proizvod</h2>
        <div className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="product-search">Pretraži proizvod</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Pretraži proizvod..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  // Delay closing dropdown to allow click on items
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border rounded-md bg-background absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto z-50 shadow-lg">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onMouseDown={(e) => {
                      // Use onMouseDown to prevent blur from firing first
                      e.preventDefault();
                      setSelectedProductId(product.id);
                      setSearchInput(product.name);
                      setSearchResults([]);
                      setIsSearchFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.categoryName} -{" "}
                      {parseFloat(product.currentPrice).toFixed(2)} дин
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-quantity">Količina</Label>
            <NumberInput
              stepper={1}
              min={1}
              decimalScale={0}
              value={productQuantity}
              onValueChange={(value) => setProductQuantity(value)}
            />
          </div>

          <Button
            onClick={handleAddProduct}
            disabled={!selectedProductId || isAddingProduct}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dodaj proizvod
          </Button>
        </div>
      </div>

      {/* Orders Section */}
      {orders.length > 0 && (
        <div className="border rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Narudžbine ({orders.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearOrdersDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                Obriši sve narudžbine
              </Button>
            </div>

            <div className="border rounded-lg relative overflow-x-auto">
              <Table className="compact-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedOrderIds.size === orders.length &&
                          orders.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Proizvod</TableHead>
                    <TableHead>Vreme</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Količina</TableHead>
                    <TableHead>Ukupno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const price = parseFloat(order.orderedPrice);
                    const total = price * order.quantity;
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOrder(order.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{order.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.categoryName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString(
                            "sr-RS",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </TableCell>
                        <TableCell>{price.toFixed(2)} дин</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateQuantity(
                                  order.id,
                                  order.quantity - 1,
                                )
                              }
                              className="h-7 w-7 p-0 text-xs"
                            >
                              −
                            </Button>
                            <span className="w-6 text-center text-sm">
                              {order.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateQuantity(
                                  order.id,
                                  order.quantity + 1,
                                )
                              }
                              className="h-7 w-7 p-0 text-xs"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {total.toFixed(2)} дин
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.paymentStatus === "paid"
                                ? "default"
                                : "secondary"
                            }
                            className="cursor-pointer hover:opacity-80"
                            onClick={() =>
                              handleTogglePaymentStatus(
                                order.id,
                                order.paymentStatus,
                              )
                            }
                          >
                            {order.paymentStatus === "paid"
                              ? "Plaćeno"
                              : "Nije plaćeno"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleTogglePaymentStatus(
                                    order.id,
                                    order.paymentStatus,
                                  )
                                }
                              >
                                {order.paymentStatus === "paid"
                                  ? "Nije plaćeno"
                                  : "Plaćeno"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteOrderId(order.id)}
                              >
                                Obriši
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Selection overlay */}
              {selectedOrderIds.size > 0 && (
                <div className="absolute top-0 left-0 right-0 bg-background border-b flex items-center justify-between px-4 h-[42px]">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={
                        selectedOrderIds.size === orders.length &&
                        orders.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-normal">
                      {selectedOrderIds.size} stavka(e) izabrane
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrderIds(new Set())}
                      className="h-6 text-xs"
                    >
                      Otkaži
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkTogglePaymentStatus("paid")}
                      disabled={isDeleting}
                      className="h-6 text-xs"
                    >
                      Plaćeno
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkTogglePaymentStatus("unpaid")}
                      disabled={isDeleting}
                      className="h-6 text-xs"
                    >
                      Nije plaćeno
                    </Button>
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

            {/* Bottom action buttons - mark all as paid/unpaid */}
            {selectedOrderIds.size === 0 && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <span className="text-xs text-muted-foreground mr-2">
                  Označi sve kao:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllAs("paid")}
                  disabled={orders.length === 0 || isDeleting}
                  className="text-xs"
                >
                  Plaćeno
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllAs("unpaid")}
                  disabled={orders.length === 0 || isDeleting}
                  className="text-xs"
                >
                  Nije plaćeno
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground mb-6">
          <p>Nema narudžbina za ovaj sto. Dodajte proizvode gore.</p>
        </div>
      )}

      {/* Table Info Section */}
      <div className="border rounded-lg p-6 space-y-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold mb-4">Informacije o stolu</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Broj</p>
                <p className="font-semibold">#{table.number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={table.status === "active" ? "default" : "secondary"}
                  className="mt-1"
                >
                  {table.status === "active" ? "Aktivan" : "Neaktivan"}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditingTable(!isEditingTable);
              if (isEditingTable) {
                setTableFormErrors({});
              }
            }}
            className="hidden md:inline-flex"
          >
            {isEditingTable ? "Otkaži" : "Uredi"}
          </Button>
        </div>

        {isEditingTable && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="table-number">Broj stola</Label>
              <NumberInput
                stepper={1}
                min={1}
                decimalScale={0}
                value={tableFormData.number}
                onValueChange={(value) =>
                  setTableFormData({
                    ...tableFormData,
                    number: value || tableFormData.number,
                  })
                }
              />
              {tableFormErrors.number && (
                <p className="text-sm text-destructive">{tableFormErrors.number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-status">Status</Label>
              <Select
                value={tableFormData.status}
                onValueChange={(value) =>
                  setTableFormData({
                    ...tableFormData,
                    status: value as any,
                  })
                }
              >
                <SelectTrigger id="table-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktivan</SelectItem>
                  <SelectItem value="inactive">Neaktivan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingTable(false)}
              >
                Otkaži
              </Button>
              <Button onClick={handleUpdateTable} disabled={isLoadingTable}>
                Sačuvaj
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteTableDialog(true)}
                disabled={isLoadingTable}
                className="hidden md:inline-flex"
              >
                Obriši sto
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Section - at bottom */}
      {orders.length > 0 && (
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Prihod</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ukupno</p>
              <p className="text-2xl font-bold">
                {orders
                  .reduce(
                    (sum, order) =>
                      sum + parseFloat(order.orderedPrice) * order.quantity,
                    0,
                  )
                  .toFixed(2)}{" "}
                дин
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plaćeno</p>
              <p className="text-2xl font-bold text-green-600">
                {orders
                  .filter((o) => o.paymentStatus === "paid")
                  .reduce(
                    (sum, order) =>
                      sum + parseFloat(order.orderedPrice) * order.quantity,
                    0,
                  )
                  .toFixed(2)}{" "}
                дин
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nije plaćeno</p>
              <p className="text-2xl font-bold text-orange-600">
                {orders
                  .filter((o) => o.paymentStatus === "unpaid")
                  .reduce(
                    (sum, order) =>
                      sum + parseFloat(order.orderedPrice) * order.quantity,
                    0,
                  )
                  .toFixed(2)}{" "}
                дин
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Dialog */}
      <Dialog
        open={showDeleteTableDialog}
        onOpenChange={setShowDeleteTableDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši sto</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete sto #{table.number}? Ovo
              će obrisati i sve narudžbine za ovaj sto. Ova akcija se ne može
              poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteTableDialog(false)}
              disabled={isLoadingTable}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteTable}
              disabled={isLoadingTable}
            >
              {isLoadingTable ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Orders Dialog */}
      <Dialog
        open={showClearOrdersDialog}
        onOpenChange={setShowClearOrdersDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši sve narudžbine</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete sve narudžbine za ovaj
              sto? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearOrdersDialog(false)}
              disabled={isDeleting}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearAllOrders}
              disabled={isDeleting}
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Dialog */}
      {deleteOrderId && (
        <Dialog
          open={!!deleteOrderId}
          onOpenChange={() => setDeleteOrderId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Obriši stavku</DialogTitle>
              <DialogDescription>
                Da li ste sigurni da želite da obrišete ovu stavku iz
                narudžbine? Ova akcija se ne može poništiti.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOrderId(null)}
                disabled={isDeleting}
              >
                Otkaži
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteOrder(deleteOrderId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Brisanje..." : "Obriši"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
