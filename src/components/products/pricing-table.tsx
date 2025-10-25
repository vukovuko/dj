import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Input } from "~/components/ui/input"
import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useEffect } from "react"

interface PricingProduct {
  id: string
  name: string
  categoryName: string | null
  currentPrice: string
  basePrice: string
  minPrice: string
  maxPrice: string
  salesCount: number
  trend: "up" | "down"
}

interface PriceChanges {
  [productId: string]: {
    basePrice: number
    minPrice: number
    maxPrice: number
    salesCount: number
  }
}

interface PricingTableProps {
  products: PricingProduct[]
  onChangesUpdate: (changes: PriceChanges) => void
}

export function PricingTable({ products, onChangesUpdate }: PricingTableProps) {
  const [changes, setChanges] = useState<PriceChanges>({})

  // Notify parent when changes update
  useEffect(() => {
    onChangesUpdate(changes)
  }, [changes, onChangesUpdate])

  const handlePriceChange = (productId: string, field: "basePrice" | "minPrice" | "maxPrice" | "salesCount", value: string) => {
    const numValue = field === "salesCount" ? parseInt(value) : parseFloat(value)

    // If value is empty or invalid, remove from changes
    if (value === "" || isNaN(numValue)) {
      setChanges((prev) => {
        const newChanges = { ...prev }
        if (newChanges[productId]) {
          delete newChanges[productId]
        }
        return newChanges
      })
      return
    }

    const product = products.find((p) => p.id === productId)
    if (!product) return

    setChanges((prev) => ({
      ...prev,
      [productId]: {
        basePrice: field === "basePrice" ? numValue : prev[productId]?.basePrice ?? parseFloat(product.basePrice),
        minPrice: field === "minPrice" ? numValue : prev[productId]?.minPrice ?? parseFloat(product.minPrice),
        maxPrice: field === "maxPrice" ? numValue : prev[productId]?.maxPrice ?? parseFloat(product.maxPrice),
        salesCount: field === "salesCount" ? numValue : prev[productId]?.salesCount ?? product.salesCount,
      },
    }))
  }

  const getCurrentValue = (product: PricingProduct, field: "basePrice" | "minPrice" | "maxPrice") => {
    const changedValue = changes[product.id]?.[field]
    if (changedValue !== undefined) {
      return changedValue.toFixed(2)
    }
    return parseFloat(product[field]).toFixed(2)
  }

  const getCurrentSalesCount = (product: PricingProduct) => {
    return changes[product.id]?.salesCount?.toString() ?? product.salesCount.toString()
  }

  const isChanged = (productId: string) => {
    return productId in changes
  }

  return (
    <div className="border rounded-lg">
      <Table className="compact-table">
        <TableHeader>
          <TableRow>
            <TableHead>Proizvod</TableHead>
            <TableHead>Trenutna cena</TableHead>
            <TableHead>Osnovna cena</TableHead>
            <TableHead>Minimalna cena</TableHead>
            <TableHead>Maksimalna cena</TableHead>
            <TableHead>Kupljeno</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nema aktivnih proizvoda
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow
                key={product.id}
                className={isChanged(product.id) ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
              >
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span>{parseFloat(product.currentPrice).toFixed(2)} RSD</span>
                    {product.trend === "up" ? (
                      <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getCurrentValue(product, "basePrice")}
                    onChange={(e) => handlePriceChange(product.id, "basePrice", e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getCurrentValue(product, "minPrice")}
                    onChange={(e) => handlePriceChange(product.id, "minPrice", e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getCurrentValue(product, "maxPrice")}
                    onChange={(e) => handlePriceChange(product.id, "maxPrice", e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={getCurrentSalesCount(product)}
                    onChange={(e) => handlePriceChange(product.id, "salesCount", e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
