import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  getPriceUpdateInterval,
  getPricingStatus,
  setPriceUpdateInterval,
  updatePricingConfig,
} from "~/queries/products.server";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  loader: async () => {
    const [pricingStatus, interval] = await Promise.all([
      getPricingStatus(),
      getPriceUpdateInterval(),
    ]);
    return { pricingStatus, interval };
  },
});

function SettingsPage() {
  const router = useRouter();
  const { pricingStatus, interval } = Route.useLoaderData();
  const [isSaving, setIsSaving] = useState(false);
  const [priceUpdateIntervalMinutes, setPriceUpdateIntervalMinutes] =
    useState<string>(interval.minutes.toString());

  // Get first product to get current settings (all products share same settings)
  const firstProduct = pricingStatus[0];

  const [pricingMode, setPricingMode] = useState<string>(
    firstProduct?.pricingMode || "full",
  );
  const [priceIncreasePercent, setPriceIncreasePercent] = useState<string>(
    firstProduct?.priceIncreasePercent || "2.00",
  );
  const [priceIncreaseRandomPercent, setPriceIncreaseRandomPercent] =
    useState<string>(firstProduct?.priceIncreaseRandomPercent || "1.00");
  const [priceDecreasePercent, setPriceDecreasePercent] = useState<string>(
    firstProduct?.priceDecreasePercent || "1.00",
  );
  const [priceDecreaseRandomPercent, setPriceDecreaseRandomPercent] =
    useState<string>(firstProduct?.priceDecreaseRandomPercent || "0.00");

  useEffect(() => {
    if (firstProduct) {
      setPricingMode(firstProduct.pricingMode || "full");
      setPriceIncreasePercent(firstProduct.priceIncreasePercent || "2.00");
      setPriceIncreaseRandomPercent(
        firstProduct.priceIncreaseRandomPercent || "1.00",
      );
      setPriceDecreasePercent(firstProduct.priceDecreasePercent || "1.00");
      setPriceDecreaseRandomPercent(
        firstProduct.priceDecreaseRandomPercent || "0.00",
      );
    }
  }, [firstProduct]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update pricing config
      const result = await updatePricingConfig({
        data: {
          pricingMode,
          priceIncreasePercent: parseFloat(priceIncreasePercent),
          priceIncreaseRandomPercent: parseFloat(priceIncreaseRandomPercent),
          priceDecreasePercent: parseFloat(priceDecreasePercent),
          priceDecreaseRandomPercent: parseFloat(priceDecreaseRandomPercent),
        },
      });

      // Update price update interval
      await setPriceUpdateInterval({
        data: { minutes: parseInt(priceUpdateIntervalMinutes) },
      });

      toast.success(
        `Podešavanja ažurirana za ${result.updatedCount} proizvod(a)`,
      );
      router.invalidate();
    } catch (error: any) {
      console.error("Failed to update pricing config:", error);
      toast.error(error.message || "Greška pri ažuriranju podešavanja");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Podešavanja dinamičkog određivanja cena
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfigurišite kako se cene proizvoda automatski menjaju
        </p>
      </div>

      {/* Mode Section */}
      <div className="mb-8 p-4 md:p-6 border rounded-lg">
        <Label htmlFor="mode" className="text-base font-semibold mb-4 block">
          Režim određivanja cena
        </Label>
        <Select value={pricingMode} onValueChange={setPricingMode}>
          <SelectTrigger id="mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Isključeno</SelectItem>
            <SelectItem value="up">Samo povećanje</SelectItem>
            <SelectItem value="down">Samo sniženje</SelectItem>
            <SelectItem value="full">Povećanje i sniženje</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          {pricingMode === "off" && "Cene se ne menjaju automatski"}
          {pricingMode === "up" && "Cene se samo povećavaju na osnovu prodaje"}
          {pricingMode === "down" && "Cene se samo snižavaju kada nema prodaje"}
          {pricingMode === "full" &&
            "Cene se povećavaju ili snižavaju zavisno od prodaje"}
        </p>
      </div>

      {/* Update Interval Section */}
      <div className="mb-8 p-4 md:p-6 border rounded-lg">
        <Label
          htmlFor="interval"
          className="text-base font-semibold mb-4 block"
        >
          Učestalost ažuriranja cena
        </Label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              id="interval"
              type="number"
              min="1"
              max="60"
              value={priceUpdateIntervalMinutes}
              onChange={(e) => setPriceUpdateIntervalMinutes(e.target.value)}
              className="w-full"
            />
          </div>
          <span className="text-sm text-muted-foreground pb-2">minuta</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Cene će se automatski ažurirati svakih {priceUpdateIntervalMinutes}{" "}
          minuta (1-60 min)
        </p>
      </div>

      {/* Percentage Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Increase Section */}
        <div className="p-4 md:p-6 border rounded-lg">
          <h3 className="font-semibold text-base mb-4">Povećanje cene</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="increaseBase" className="text-sm">
                Osnovna razlika (%)
              </Label>
              <Input
                id="increaseBase"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={priceIncreasePercent}
                onChange={(e) => setPriceIncreasePercent(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Osnovna razlika povećanja cene (0.1% - 10%)
              </p>
            </div>
            <div>
              <Label htmlFor="increaseRandom" className="text-sm">
                Nasumična razlika (%)
              </Label>
              <Input
                id="increaseRandom"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={priceIncreaseRandomPercent}
                onChange={(e) => setPriceIncreaseRandomPercent(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Slučajni faktor na povećanje (0% - 5%)
              </p>
            </div>
          </div>
        </div>

        {/* Decrease Section */}
        <div className="p-4 md:p-6 border rounded-lg">
          <h3 className="font-semibold text-base mb-4">Sniženje cene</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="decreaseBase" className="text-sm">
                Osnovna razlika (%)
              </Label>
              <Input
                id="decreaseBase"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={priceDecreasePercent}
                onChange={(e) => setPriceDecreasePercent(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Osnovna razlika sniženja cene (0.1% - 10%)
              </p>
            </div>
            <div>
              <Label htmlFor="decreaseRandom" className="text-sm">
                Nasumična razlika (%)
              </Label>
              <Input
                id="decreaseRandom"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={priceDecreaseRandomPercent}
                onChange={(e) => setPriceDecreaseRandomPercent(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Slučajni faktor na sniženje (0% - 5%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="mb-8 p-4 md:p-6 border rounded-lg">
        <h4 className="font-semibold text-sm mb-3">Primer proračuna</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Ako se proizvod proda:</strong>
            <div className="ml-4 mt-1">
              Povećanje = {priceIncreasePercent}% + (slučajno(0,1) ×{" "}
              {priceIncreaseRandomPercent}%)
            </div>
          </div>
          <div>
            <strong>Ako se proizvod ne proda:</strong>
            <div className="ml-4 mt-1">
              Sniženje = {priceDecreasePercent}% + (slučajno(0,1) ×{" "}
              {priceDecreaseRandomPercent}%)
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? "Čuvanje..." : "Sačuvaj podešavanja"}
      </Button>
    </div>
  );
}
