import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PricingTable } from "~/components/products/pricing-table";
import { Button } from "~/components/ui/button";
import {
  bulkUpdatePrices,
  getPricingStatus,
  resetPricesToDefault,
  syncSalesCount,
  updateAllPrices,
} from "~/queries/products.server";

// ========== ROUTE ==========

export const Route = createFileRoute("/admin/pricing")({
  component: PricingPage,
  loader: async () => {
    return await getPricingStatus();
  },
});

// ========== COMPONENT ==========

interface PriceChanges {
  [productId: string]: {
    currentPrice?: number;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
    totalSalesCount: number;
  };
}

function PricingPage() {
  const router = useRouter();
  const products = Route.useLoaderData();
  const [changes, setChanges] = useState<PriceChanges>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const hasChanges = Object.keys(changes).length > 0;

  const handleChangesUpdate = useCallback((newChanges: PriceChanges) => {
    setChanges(newChanges);
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate all changes
    for (const [productId, priceData] of Object.entries(changes)) {
      if (priceData.minPrice >= priceData.maxPrice) {
        toast.error(`Greška: Minimalna cena mora biti manja od maksimalne`);
        return;
      }
      if (
        priceData.minPrice <= 0 ||
        priceData.maxPrice <= 0 ||
        priceData.basePrice <= 0
      ) {
        toast.error(`Greška: Sve cene moraju biti veće od 0`);
        return;
      }
      if (priceData.totalSalesCount < 0) {
        toast.error(`Greška: Broj prodatih jedinica ne može biti negativan`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const updates = Object.entries(changes).map(([id, prices]) => ({
        id,
        ...prices,
      }));

      const result = await bulkUpdatePrices({
        data: { updates },
      });

      toast.success(`Uspešno ažurirano ${result.count} proizvod(a)`);
      setChanges({});
      router.invalidate();
    } catch (error) {
      console.error("Failed to update prices:", error);
      toast.error("Greška pri ažuriranju cena");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePricesNow = async () => {
    setIsUpdatingPrices(true);
    try {
      const result = await updateAllPrices();
      toast.success(
        `Cene ažurirane: ${result.updatedCount} proizvod(a) promenjeno`,
      );
      router.invalidate();
    } catch (error) {
      console.error("Failed to update prices:", error);
      toast.error("Greška pri ažuriranju cena");
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleSyncSalesCount = async () => {
    setIsSyncing(true);
    try {
      const result = await syncSalesCount();
      toast.success(`Sinhronizovano ${result.syncedCount} proizvod(a)`);
      router.invalidate();
    } catch (error) {
      console.error("Failed to sync sales count:", error);
      toast.error("Greška pri sinhronizaciji");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetPrices = async () => {
    setIsResetting(true);
    try {
      const result = await resetPricesToDefault();
      toast.success(
        `Cene resetovane: ${result.resetCount} proizvod(a) na 70% max cene`,
      );
      router.invalidate();
    } catch (error) {
      console.error("Failed to reset prices:", error);
      toast.error("Greška pri resetovanju cena");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    setChanges({});
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cene</h1>
          <p className="text-sm text-muted-foreground">
            Upravljajte cenama proizvoda
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleResetPrices}
            disabled={isResetting}
            variant="outline"
          >
            {isResetting ? "Resetovanje..." : "Resetuj cene"}
          </Button>
          <Button
            onClick={handleSyncSalesCount}
            disabled={isSyncing}
            variant="outline"
          >
            {isSyncing ? "Sinhronizacija..." : "Sinhronizuj kupljeno"}
          </Button>
          <Button
            onClick={handleUpdatePricesNow}
            disabled={isUpdatingPrices}
            variant="outline"
          >
            {isUpdatingPrices ? "Ažuriranje..." : "Promeni cene sada"}
          </Button>
          {hasChanges && (
            <Button onClick={handleCancel} variant="outline">
              Otkazi
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Čuvanje..." : "Sačuvaj"}
          </Button>
        </div>
      </div>

      {/* Pricing Table */}
      <PricingTable products={products} onChangesUpdate={handleChangesUpdate} />

      {/* Info message when changes exist */}
      {hasChanges && (
        <div className="mt-4 text-sm text-muted-foreground">
          {Object.keys(changes).length} proizvod(a) promenjeno
        </div>
      )}
    </div>
  );
}
