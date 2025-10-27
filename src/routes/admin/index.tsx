import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Tag, Video, WandSparkles, Settings } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const navigationCards = [
  {
    title: "Proizvodi",
    description: "Upravljajte proizvodima, cenama i kategorijama",
    icon: Package,
    url: "/admin/products",
  },
  {
    title: "Cene",
    description: "Podešavanje cena i akcijskih popusta",
    icon: Tag,
    url: "/admin/pricing",
  },
  {
    title: "Video Biblioteka",
    description: "Pregledajte i upravljajte video sadržajem",
    icon: Video,
    url: "/admin/videos",
  },
  {
    title: "Generacija videa",
    description: "Kreirajte nove video sadržaje pomoću AI",
    icon: WandSparkles,
    url: "/admin/videos/generacija",
  },
  {
    title: "Podešavanja",
    description: "Sistemska podešavanja i konfiguracija",
    icon: Settings,
    url: "/admin/settings",
  },
];

function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Kontrolna tabla</h1>
        <p className="text-sm text-muted-foreground">Pregled sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {navigationCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.url}
              to={card.url}
              className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <div className="bg-accent mb-5 flex size-16 items-center justify-center rounded-full">
                <Icon className="size-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{card.title}</h3>
              <p className="text-muted-foreground">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
