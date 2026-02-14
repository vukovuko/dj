import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { authClient } from "~/lib/auth-client";
import {
  createQuickAd,
  playQuickAd,
  updateQuickAd,
} from "~/queries/quick-ads.server";

interface Product {
  id: string;
  name: string;
  currentPrice: string;
  minPrice: string;
  maxPrice: string;
  categoryName: string | null;
}

interface QuickAd {
  id: string;
  name: string;
  productId: string | null;
  promotionalPrice: string | null;
  updatePrice: boolean;
  displayText: string | null;
  displayPrice: string | null;
  durationSeconds: number;
  productName: string | null;
  currentPrice: string | null;
  minPrice: string | null;
  maxPrice: string | null;
}

interface QuickAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  editingAd?: QuickAd | null;
  onSuccess: () => void;
}

export function QuickAdDialog({
  open,
  onOpenChange,
  products,
  editingAd,
  onSuccess,
}: QuickAdDialogProps) {
  const { data: session } = authClient.useSession();

  const [name, setName] = useState("");
  const [contentType, setContentType] = useState<"product" | "text">("text");

  // Product mode state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [updatePrice, setUpdatePrice] = useState(false);

  // Free text mode state
  const [displayText, setDisplayText] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");

  // Shared
  const [durationSeconds, setDurationSeconds] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(e.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // Reset/populate form when dialog opens
  useEffect(() => {
    if (!open) return;

    if (editingAd) {
      setName(editingAd.name);
      if (editingAd.productId) {
        setContentType("product");
        setSelectedProductId(editingAd.productId);
        setPromotionalPrice(
          editingAd.promotionalPrice
            ? Math.round(parseFloat(editingAd.promotionalPrice)).toString()
            : "",
        );
        setUpdatePrice(editingAd.updatePrice);
        setDisplayText("");
        setDisplayPrice("");
      } else {
        setContentType("text");
        setSelectedProductId("");
        setPromotionalPrice("");
        setUpdatePrice(false);
        setDisplayText(editingAd.displayText || "");
        setDisplayPrice(editingAd.displayPrice || "");
      }
      setDurationSeconds(editingAd.durationSeconds.toString());
    } else {
      setName("");
      setContentType("text");
      setSelectedProductId("");
      setProductSearch("");
      setIsProductDropdownOpen(false);
      setPromotionalPrice("");
      setUpdatePrice(false);
      setDisplayText("");
      setDisplayPrice("");
      setDurationSeconds("5");
    }
  }, [open, editingAd]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (andPlay: boolean) => {
    if (!name.trim()) {
      toast.error("Unesite naziv reklame");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Niste prijavljeni");
      return;
    }

    if (contentType === "product") {
      if (!selectedProductId) {
        toast.error("Izaberite proizvod");
        return;
      }
      if (!promotionalPrice) {
        toast.error("Unesite cenu za proizvod");
        return;
      }
      if (selectedProduct) {
        const priceNum = parseFloat(promotionalPrice);
        const minPrice = Math.round(parseFloat(selectedProduct.minPrice));
        const maxPrice = Math.round(parseFloat(selectedProduct.maxPrice));
        if (isNaN(priceNum) || priceNum <= 0) {
          toast.error("Cena mora biti pozitivan broj");
          return;
        }
        if (priceNum < minPrice || priceNum > maxPrice) {
          toast.error(`Cena mora biti između ${minPrice} i ${maxPrice} RSD`);
          return;
        }
      }
    } else {
      if (!displayText.trim()) {
        toast.error("Unesite tekst za prikaz");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let adId: string;

      if (editingAd) {
        const updated = await updateQuickAd({
          data: {
            id: editingAd.id,
            name: name.trim(),
            productId: contentType === "product" ? selectedProductId : null,
            promotionalPrice:
              contentType === "product"
                ? parseFloat(promotionalPrice)
                : undefined,
            updatePrice: contentType === "product" ? updatePrice : false,
            displayText: contentType === "text" ? displayText.trim() : null,
            displayPrice:
              contentType === "text" && displayPrice.trim()
                ? displayPrice.trim()
                : null,
            durationSeconds: parseInt(durationSeconds),
          },
        });
        adId = updated.id;
        toast.success("Reklama je ažurirana!");
      } else {
        const created = await createQuickAd({
          data: {
            name: name.trim(),
            ...(contentType === "product"
              ? {
                  productId: selectedProductId,
                  promotionalPrice: parseFloat(promotionalPrice),
                  updatePrice,
                }
              : {
                  displayText: displayText.trim(),
                  displayPrice: displayPrice.trim() || undefined,
                }),
            durationSeconds: parseInt(durationSeconds),
            createdBy: session.user.id,
          },
        });
        adId = created.id;
        toast.success("Reklama je kreirana!");
      }

      if (andPlay) {
        try {
          await playQuickAd({ data: { id: adId } });
          toast.success("Reklama se prikazuje na TV-u!");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Greška pri puštanju reklame";
          toast.error(message);
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save quick ad:", error);
      toast.error("Greška pri čuvanju reklame");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAd ? "Izmeni reklamu" : "Nova reklama"}
          </DialogTitle>
          <DialogDescription>
            {editingAd
              ? "Izmenite i opcionalno pustite reklamu na TV-u"
              : "Kreirajte brzu reklamu za prikaz na TV ekranu"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ad Name */}
          <div className="space-y-2">
            <Label htmlFor="ad-name">Naziv reklame</Label>
            <Input
              id="ad-name"
              placeholder="npr. 10 shots akcija"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Content Type Toggle */}
          <div className="space-y-2">
            <Label>Tip sadržaja</Label>
            <Select
              value={contentType}
              onValueChange={(v) => {
                setContentType(v as "product" | "text");
                // Reset type-specific fields
                setSelectedProductId("");
                setProductSearch("");
                setPromotionalPrice("");
                setUpdatePrice(false);
                setDisplayText("");
                setDisplayPrice("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Slobodan tekst</SelectItem>
                <SelectItem value="product">Proizvod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contentType === "product" ? (
            <>
              {/* Product Selector */}
              <div className="space-y-2">
                <Label>Proizvod</Label>
                {selectedProductId && selectedProduct ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <span className="flex-1 text-sm truncate">
                      {selectedProduct.name}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(parseFloat(selectedProduct.currentPrice))}{" "}
                        RSD)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId("");
                        setProductSearch("");
                        setPromotionalPrice("");
                      }}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div ref={productSearchRef} className="relative">
                    <Input
                      placeholder="Pretražite koktel..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                    />
                    {isProductDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                        {filteredProducts.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Nema rezultata
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-left"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedProductId(product.id);
                                setProductSearch("");
                                setIsProductDropdownOpen(false);
                              }}
                            >
                              <span className="truncate">{product.name}</span>
                              <span className="text-muted-foreground shrink-0">
                                {Math.round(parseFloat(product.currentPrice))}{" "}
                                RSD
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Promotional Price + Update toggle */}
              {selectedProductId && selectedProduct && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="promo-price" className="text-xs">
                      Cena za prikaz (RSD)
                    </Label>
                    <Input
                      id="promo-price"
                      type="number"
                      min={Math.round(parseFloat(selectedProduct.minPrice))}
                      max={Math.round(parseFloat(selectedProduct.maxPrice))}
                      placeholder={Math.round(
                        parseFloat(selectedProduct.currentPrice),
                      ).toString()}
                      value={promotionalPrice}
                      onChange={(e) => setPromotionalPrice(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Min: {Math.round(parseFloat(selectedProduct.minPrice))}{" "}
                      &mdash; Max:{" "}
                      {Math.round(parseFloat(selectedProduct.maxPrice))} RSD
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="update-price"
                      checked={updatePrice}
                      onCheckedChange={(checked) =>
                        setUpdatePrice(checked === true)
                      }
                    />
                    <Label htmlFor="update-price" className="text-sm">
                      Ažuriraj cenu u sistemu
                    </Label>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Free Text Fields */}
              <div className="space-y-2">
                <Label htmlFor="display-text">Tekst za prikaz</Label>
                <Input
                  id="display-text"
                  placeholder="npr. 10 SHOTS"
                  value={displayText}
                  onChange={(e) => setDisplayText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-price">Cena za prikaz (opciono)</Label>
                <Input
                  id="display-price"
                  placeholder="npr. 1500"
                  value={displayPrice}
                  onChange={(e) => setDisplayPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Prikazuje se kao cena ispod teksta na TV-u
                </p>
              </div>
            </>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label>Trajanje prikaza</Label>
            <Select value={durationSeconds} onValueChange={setDurationSeconds}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 sekunde</SelectItem>
                <SelectItem value="5">5 sekundi</SelectItem>
                <SelectItem value="8">8 sekundi</SelectItem>
                <SelectItem value="10">10 sekundi</SelectItem>
                <SelectItem value="15">15 sekundi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TV Preview */}
          {(() => {
            const previewName =
              contentType === "product"
                ? selectedProduct?.name
                : displayText.trim();
            const previewNewPrice =
              contentType === "product"
                ? promotionalPrice
                  ? Math.round(parseFloat(promotionalPrice)) || null
                  : null
                : displayPrice.trim()
                  ? Math.round(parseFloat(displayPrice)) || null
                  : null;
            const previewOldPrice =
              contentType === "product" && selectedProduct
                ? Math.round(parseFloat(selectedProduct.currentPrice))
                : null;
            const isDiscount =
              previewOldPrice !== null && previewNewPrice !== null
                ? previewNewPrice < previewOldPrice
                : true;

            if (!previewName) return null;

            return (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Pregled TV prikaza
                </Label>
                <div
                  className="relative rounded-lg overflow-hidden bg-black/95"
                  style={{ aspectRatio: "16/9" }}
                >
                  {/* Background gradient */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className={`absolute inset-0 ${
                        isDiscount
                          ? "bg-gradient-to-r from-emerald-900/30 via-transparent to-emerald-900/20"
                          : "bg-gradient-to-r from-amber-900/30 via-transparent to-amber-900/20"
                      }`}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_70%)]" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
                    <h2
                      className="text-xl font-black text-white tracking-wider uppercase text-center leading-tight"
                      style={{
                        textShadow:
                          "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)",
                      }}
                    >
                      {previewName}
                    </h2>

                    {previewNewPrice !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        {previewOldPrice !== null && (
                          <>
                            <span className="text-sm font-mono text-white/30 line-through">
                              {previewOldPrice}
                            </span>
                            <span className="text-sm text-white/50">
                              &rarr;
                            </span>
                          </>
                        )}
                        <span
                          className={`text-3xl font-mono font-black tabular-nums leading-none ${
                            isDiscount ? "text-emerald-400" : "text-amber-400"
                          }`}
                          style={{
                            textShadow: isDiscount
                              ? "0 0 20px rgba(52, 211, 153, 0.5)"
                              : "0 0 20px rgba(251, 191, 36, 0.5)",
                          }}
                        >
                          {previewNewPrice}
                        </span>
                        <span className="text-xs text-white/40 font-mono">
                          RSD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Otkaži
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Čuvanje..." : editingAd ? "Sačuvaj" : "Kreiraj"}
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={isSubmitting}>
            {isSubmitting
              ? "Čuvanje..."
              : editingAd
                ? "Sačuvaj i pusti"
                : "Kreiraj i pusti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
