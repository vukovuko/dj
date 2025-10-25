import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Checkbox } from "~/components/ui/checkbox"
import { Badge } from "~/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Button } from "~/components/ui/button"
import { MoreVertical, Edit, ToggleLeft } from "lucide-react"
import { Link } from "@tanstack/react-router"

interface Product {
  id: string
  name: string
  currentPrice: string
  status: "active" | "draft"
  categoryName: string | null
}

interface ProductsTableProps {
  products: Product[]
  selectedIds: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectOne: (id: string, checked: boolean) => void
  onToggleStatus: (id: string) => void
  onBulkDelete?: () => void
  onBulkDraft?: () => void
}

export function ProductsTable({
  products,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onToggleStatus,
  onBulkDelete,
  onBulkDraft,
}: ProductsTableProps) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id))
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected

  return (
    <div className="border rounded-lg relative">
      <Table className="compact-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onSelectAll}
                aria-label="Izaberi sve"
              />
            </TableHead>
            <TableHead>Naziv</TableHead>
            <TableHead>Kategorija</TableHead>
            <TableHead>Cena</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nema proizvoda
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/50">
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(checked) => onSelectOne(product.id, checked as boolean)}
                    aria-label={`Izaberi ${product.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    from="/admin/products/"
                    to="/admin/products/$id"
                    params={{ id: product.id }}
                    className="block py-2 hover:underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    from="/admin/products/"
                    to="/admin/products/$id"
                    params={{ id: product.id }}
                    className="block py-2"
                  >
                    {product.categoryName || "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    from="/admin/products/"
                    to="/admin/products/$id"
                    params={{ id: product.id }}
                    className="block py-2"
                  >
                    {parseFloat(product.currentPrice).toFixed(2)} RSD
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    from="/admin/products/"
                    to="/admin/products/$id"
                    params={{ id: product.id }}
                    className="block py-2"
                  >
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status === "active" ? "Aktivan" : "Draft"}
                    </Badge>
                  </Link>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Otvori meni</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          from="/admin/products/"
                          to="/admin/products/$id"
                          params={{ id: product.id }}
                          className="flex items-center cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Uredi
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onToggleStatus(product.id)
                      }}>
                        <ToggleLeft className="mr-2 h-4 w-4" />
                        {product.status === "active" ? "Draftuj" : "Aktiviraj"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Overlay kada su proizvodi selektovani */}
      {selectedIds.size > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-background border-b flex items-center justify-between px-4 h-[42px]">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={onSelectAll}
              aria-label="Izaberi sve"
            />
            <span className="text-sm font-normal">
              {selectedIds.size} proizvod(a) izabrano
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onBulkDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDraft}
                className="h-6 text-xs"
              >
                Draftuj sve
              </Button>
            )}
            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDelete}
                className="text-destructive hover:text-destructive h-6 text-xs"
              >
                Izbriši sve
              </Button>
            )}
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
  )
}
