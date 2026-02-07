import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ProductPageHeaderProps {
  title: string;
  onBack: () => void;
}

export function ProductPageHeader({ title, onBack }: ProductPageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}
