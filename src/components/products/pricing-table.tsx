import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { NumberInput } from "~/components/ui/number-input"
import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useEffect } from "react"

interface PricingProduct {
  id: string
  name: string
  categoryName: string | null
  currentPrice: string
  previousPrice: string
  basePrice: string
  minPrice: string
  maxPrice: string
  salesCount?: number
  manualSalesAdjustment?: number
  trend: "up" | "down"
  pricingMode?: string
  priceIncreasePercent?: string
  priceIncreaseRandomPercent?: string
  priceDecreasePercent?: string
  priceDecreaseRandomPercent?: string
  lastPriceUpdate?: Date | string
  status?: string
}

interface PriceChanges {
  [productId: string]: {
    basePrice: number
    minPrice: number
    maxPrice: number
    totalSalesCount: number
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

  const handlePriceChange = (productId: string, field: "basePrice" | "minPrice" | "maxPrice" | "totalSalesCount", value: number | undefined) => {
    // If value is empty or invalid, remove from changes
    if (value === undefined) {
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

    // Calculate total sales (salesCount + manualSalesAdjustment)
    const currentTotal = (product.salesCount || 0) + (product.manualSalesAdjustment || 0)

    setChanges((prev) => ({
      ...prev,
      [productId]: {
        basePrice: field === "basePrice" ? value : prev[productId]?.basePrice ?? parseInt(product.basePrice),
        minPrice: field === "minPrice" ? value : prev[productId]?.minPrice ?? parseInt(product.minPrice),
        maxPrice: field === "maxPrice" ? value : prev[productId]?.maxPrice ?? parseInt(product.maxPrice),
        totalSalesCount: field === "totalSalesCount" ? value : prev[productId]?.totalSalesCount ?? currentTotal,
      },
    }))
  }

  const getCurrentValue = (product: PricingProduct, field: "basePrice" | "minPrice" | "maxPrice") => {
    const changedValue = changes[product.id]?.[field]
    if (changedValue !== undefined) {
      return changedValue
    }
    return parseInt(product[field])
  }

  const getTotalSalesCount = (product: PricingProduct) => {
    const changed = changes[product.id]?.totalSalesCount
    if (changed !== undefined) {
      return changed
    }
    return (product.salesCount || 0) + (product.manualSalesAdjustment || 0)
  }

  const isChanged = (productId: string) => {
    return productId in changes
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="compact-table">
        <TableHeader>
          <TableRow>
            <TableHead>Proizvod</TableHead>
            <TableHead>Trenutna</TableHead>
            <TableHead>Prethodna</TableHead>
            <TableHead>Osnovna</TableHead>
            <TableHead>Min</TableHead>
            <TableHead>Max</TableHead>
            <TableHead>Kupljeno</TableHead>
            <TableHead>Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  <span className="text-sm">{Math.round(parseFloat(product.currentPrice))} RSD</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{Math.round(parseFloat(product.previousPrice))} RSD</span>
                </TableCell>
                <TableCell>
                  <NumberInput
                    stepper={1}
                    min={0}
                    decimalScale={0}
                    value={getCurrentValue(product, "basePrice")}
                    onValueChange={(value: number | undefined) => handlePriceChange(product.id, "basePrice", value)}
                  />
                </TableCell>
                <TableCell>
                  <NumberInput
                    stepper={1}
                    min={0}
                    decimalScale={0}
                    value={getCurrentValue(product, "minPrice")}
                    onValueChange={(value: number | undefined) => handlePriceChange(product.id, "minPrice", value)}
                  />
                </TableCell>
                <TableCell>
                  <NumberInput
                    stepper={1}
                    min={0}
                    decimalScale={0}
                    value={getCurrentValue(product, "maxPrice")}
                    onValueChange={(value: number | undefined) => handlePriceChange(product.id, "maxPrice", value)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      stepper={1}
                      min={0}
                      decimalScale={0}
                      value={getTotalSalesCount(product)}
                      onValueChange={(value: number | undefined) => handlePriceChange(product.id, "totalSalesCount", value)}
                    />
                    <span className="text-xs text-muted-foreground">
                      ({product.salesCount || 0})
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {product.trend === "up" ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">↑</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">↓</span>
                      </>
                    )}
                  </div>
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
