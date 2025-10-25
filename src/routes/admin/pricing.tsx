import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Button } from '~/components/ui/button'
import { PricingTable } from '~/components/products/pricing-table'
import { toast } from 'sonner'
import { getProductsForPricing, bulkUpdatePrices } from '~/queries/products.server'

// ========== ROUTE ==========

export const Route = createFileRoute('/admin/pricing')({
  component: PricingPage,
  loader: async () => {
    return await getProductsForPricing()
  },
})

// ========== COMPONENT ==========

interface PriceChanges {
  [productId: string]: {
    basePrice: number
    minPrice: number
    maxPrice: number
    salesCount: number
  }
}

function PricingPage() {
  const router = useRouter()
  const products = Route.useLoaderData()
  const [changes, setChanges] = useState<PriceChanges>({})
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = Object.keys(changes).length > 0

  const handleChangesUpdate = useCallback((newChanges: PriceChanges) => {
    setChanges(newChanges)
  }, [])

  const handleSave = async () => {
    if (!hasChanges) return

    // Validate all changes
    for (const [productId, priceData] of Object.entries(changes)) {
      if (priceData.minPrice >= priceData.maxPrice) {
        toast.error(`Greška: Minimalna cena mora biti manja od maksimalne`)
        return
      }
      if (priceData.minPrice <= 0 || priceData.maxPrice <= 0 || priceData.basePrice <= 0) {
        toast.error(`Greška: Sve cene moraju biti veće od 0`)
        return
      }
      if (priceData.salesCount < 0) {
        toast.error(`Greška: Broj prodatih jedinica ne može biti negativan`)
        return
      }
    }

    setIsSaving(true)
    try {
      const updates = Object.entries(changes).map(([id, prices]) => ({
        id,
        ...prices,
      }))

      const result = await bulkUpdatePrices({
        data: { updates },
      })

      toast.success(`Uspešno ažurirano ${result.count} proizvod(a)`)
      setChanges({})
      router.invalidate()
    } catch (error) {
      console.error('Failed to update prices:', error)
      toast.error('Greška pri ažuriranju cena')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cene</h1>
          <p className="text-sm text-muted-foreground">
            Upravljajte cenama proizvoda
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Čuvanje...' : 'Sačuvaj'}
        </Button>
      </div>

      {/* Pricing Table */}
      <PricingTable
        products={products}
        onChangesUpdate={handleChangesUpdate}
      />

      {/* Info message when changes exist */}
      {hasChanges && (
        <div className="mt-4 text-sm text-muted-foreground">
          {Object.keys(changes).length} proizvod(a) promenjeno
        </div>
      )}
    </div>
  )
}
