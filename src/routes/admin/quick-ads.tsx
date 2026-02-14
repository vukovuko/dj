import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { sr } from "date-fns/locale/sr";
import { Megaphone, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QuickAdDialog } from "~/components/campaigns/quick-ad-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { subscribeToCampaignUpdates } from "~/queries/campaigns.server";
import {
  deleteQuickAd,
  getQuickAds,
  playQuickAd,
} from "~/queries/quick-ads.server";
import { getActiveProducts } from "~/queries/tables.server";

export const Route = createFileRoute("/admin/quick-ads")({
  component: QuickAdsPage,
  loader: async () => {
    const [quickAds, products] = await Promise.all([
      getQuickAds(),
      getActiveProducts({ data: {} }),
    ]);
    return { quickAds, products };
  },
});

function QuickAdsPage() {
  const router = useRouter();
  const { quickAds, products } = Route.useLoaderData();

  const [quickAdDialogOpen, setQuickAdDialogOpen] = useState(false);
  const [editingQuickAd, setEditingQuickAd] = useState<
    (typeof quickAds)[number] | null
  >(null);
  const [playingAdId, setPlayingAdId] = useState<string | null>(null);
  const [deleteAdTarget, setDeleteAdTarget] = useState<string | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const activeAdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to SSE for active ad tracking
  useEffect(() => {
    let aborted = false;

    const connectSSE = async () => {
      if (aborted) return;

      try {
        const response = await subscribeToCampaignUpdates();
        if (aborted) return;

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          reconnectTimeoutRef.current = setTimeout(connectSSE, 3000);
          return;
        }

        while (!aborted) {
          const { value, done } = await reader.read();
          if (done || aborted) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === "QUICK_AD_PLAY") {
                  router.invalidate();
                  if (parsed.quickAd) {
                    if (activeAdTimeoutRef.current) {
                      clearTimeout(activeAdTimeoutRef.current);
                    }
                    setActiveAdId(parsed.quickAd.id);
                    activeAdTimeoutRef.current = setTimeout(
                      () => {
                        setActiveAdId(null);
                      },
                      (parsed.quickAd.durationSeconds || 5) * 1000,
                    );
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if (aborted) return;
        console.error("Quick ads SSE error:", error);
        reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
      }
    };

    reconnectTimeoutRef.current = setTimeout(connectSSE, 500);

    return () => {
      aborted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (activeAdTimeoutRef.current) {
        clearTimeout(activeAdTimeoutRef.current);
      }
    };
  }, [router]);

  const handlePlayQuickAd = async (id: string) => {
    setPlayingAdId(id);
    try {
      await playQuickAd({ data: { id } });
      toast.success("Reklama se prikazuje na TV-u!");
      router.invalidate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Greška pri puštanju reklame";
      toast.error(message);
    } finally {
      setPlayingAdId(null);
    }
  };

  const handleDeleteQuickAd = async () => {
    if (!deleteAdTarget) return;
    setIsDeletingAd(true);
    try {
      await deleteQuickAd({ data: { id: deleteAdTarget } });
      toast.success("Reklama je obrisana");
      setDeleteAdTarget(null);
      router.invalidate();
    } catch (error) {
      console.error("Failed to delete quick ad:", error);
      toast.error("Greška pri brisanju reklame");
    } finally {
      setIsDeletingAd(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-4 md:p-6 max-w-5xl pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Brze reklame</h1>
            <p className="text-sm text-muted-foreground">
              Kreiraj i pusti reklame na TV ekranu
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingQuickAd(null);
              setQuickAdDialogOpen(true);
            }}
          >
            Dodaj reklamu
          </Button>
        </div>

        {/* Quick Ads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-sky-500" />
              Reklame ({quickAds.length})
            </CardTitle>
            <CardDescription>
              Brze tekstualne reklame za TV prikaz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quickAds.length > 0 ? (
              <div className="space-y-3">
                {quickAds.map((ad) => {
                  const isActive = ad.id === activeAdId;
                  return (
                    <div
                      key={ad.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg transition-colors ${isActive ? "border-emerald-500 bg-emerald-500/5" : ""}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{ad.name}</p>
                          {isActive && (
                            <Badge className="bg-emerald-500 animate-pulse text-xs">
                              Prikazuje se
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ad.productId ? "Proizvod" : "Tekst"}
                          </Badge>
                          <span>{ad.durationSeconds}s</span>
                          {ad.productName && (
                            <span>
                              {ad.productName}
                              {ad.promotionalPrice &&
                                ` → ${Math.round(parseFloat(ad.promotionalPrice))} RSD`}
                            </span>
                          )}
                          {!ad.productId && ad.displayText && (
                            <span className="truncate max-w-[200px]">
                              &ldquo;{ad.displayText}&rdquo;
                              {ad.displayPrice && ` — ${ad.displayPrice} RSD`}
                            </span>
                          )}
                          {ad.updatePrice && (
                            <Badge variant="secondary" className="text-xs">
                              Menja cenu
                            </Badge>
                          )}
                          <span className="text-xs">
                            {ad.lastPlayedAt
                              ? `Poslednji put: ${format(new Date(ad.lastPlayedAt), "dd.MM. HH:mm", { locale: sr })}`
                              : "Nije puštano"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handlePlayQuickAd(ad.id)}
                          disabled={playingAdId === ad.id || isActive}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          {playingAdId === ad.id ? "Puštanje..." : "Pusti"}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingQuickAd(ad);
                            setQuickAdDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteAdTarget(ad.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nema reklama. Kreirajte prvu!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Ad Dialog */}
        <QuickAdDialog
          open={quickAdDialogOpen}
          onOpenChange={setQuickAdDialogOpen}
          products={products}
          editingAd={editingQuickAd}
          onSuccess={() => {
            setQuickAdDialogOpen(false);
            setEditingQuickAd(null);
            router.invalidate();
          }}
        />

        {/* Delete Quick Ad Confirmation */}
        <AlertDialog
          open={deleteAdTarget !== null}
          onOpenChange={(open) => !open && setDeleteAdTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obriši reklamu</AlertDialogTitle>
              <AlertDialogDescription>
                Da li ste sigurni da želite da obrišete ovu reklamu?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAd}>
                Nazad
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteQuickAd}
                disabled={isDeletingAd}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingAd ? "Brisanje..." : "Obriši"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
