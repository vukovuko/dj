import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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

// Validation schema
const productSchema = z.object({
  name: z
    .string()
    .min(1, "Ovo polje je obavezno")
    .max(100, "Naziv je predugačak"),
  categoryId: z.string().min(1, "Morate izabrati kategoriju"),
  basePrice: z.coerce.number().positive("Cena mora biti veća od 0"),
  minPrice: z.coerce.number().positive("Cena mora biti veća od 0"),
  maxPrice: z.coerce.number().positive("Cena mora biti veća od 0"),
  status: z.enum(["active", "draft"]),
});

export interface ProductFormData {
  name: string;
  categoryId: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  status: "active" | "draft";
}

interface ProductFormProps {
  initialData?: ProductFormData;
  categories: Array<{ id: string; name: string }>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
}

export function ProductForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Sačuvaj",
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: "",
      categoryId: "",
      basePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      status: "active",
    },
  );

  const hasChanges =
    !initialData ||
    formData.name !== initialData.name ||
    formData.categoryId !== initialData.categoryId ||
    formData.basePrice !== initialData.basePrice ||
    formData.minPrice !== initialData.minPrice ||
    formData.maxPrice !== initialData.maxPrice ||
    formData.status !== initialData.status;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate min < max
    if (formData.minPrice >= formData.maxPrice) {
      setErrors({ minPrice: "Minimalna cena mora biti manja od maksimalne" });
      return;
    }

    // Validate with Zod
    const result = productSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      toast.error("Greška pri čuvanju proizvoda");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Greška pri brisanju proizvoda");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Naziv proizvoda <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Input
            id="name"
            type="text"
            placeholder="Npr. Mojito"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.name}
            </p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="categoryId">
          Kategorija <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Select
            value={formData.categoryId}
            onValueChange={(value) =>
              setFormData({ ...formData, categoryId: value })
            }
          >
            <SelectTrigger
              className={errors.categoryId ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Izaberite kategoriju" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.categoryId}
            </p>
          )}
        </div>
      </div>

      {/* Base Price */}
      <div className="space-y-2">
        <Label htmlFor="basePrice">
          Osnovna cena (RSD) <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Input
            id="basePrice"
            type="number"
            min="1"
            step="1"
            placeholder="400"
            value={formData.basePrice || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                basePrice: Math.round(parseFloat(e.target.value) || 0),
              })
            }
            className={errors.basePrice ? "border-destructive" : ""}
          />
          {errors.basePrice && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.basePrice}
            </p>
          )}
        </div>
      </div>

      {/* Min Price */}
      <div className="space-y-2">
        <Label htmlFor="minPrice">
          Minimalna cena (RSD) <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Input
            id="minPrice"
            type="number"
            min="1"
            step="1"
            placeholder="300"
            value={formData.minPrice || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                minPrice: Math.round(parseFloat(e.target.value) || 0),
              })
            }
            className={errors.minPrice ? "border-destructive" : ""}
          />
          {errors.minPrice && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.minPrice}
            </p>
          )}
        </div>
      </div>

      {/* Max Price */}
      <div className="space-y-2">
        <Label htmlFor="maxPrice">
          Maksimalna cena (RSD) <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Input
            id="maxPrice"
            type="number"
            min="1"
            step="1"
            placeholder="500"
            value={formData.maxPrice || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxPrice: Math.round(parseFloat(e.target.value) || 0),
              })
            }
            className={errors.maxPrice ? "border-destructive" : ""}
          />
          {errors.maxPrice && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.maxPrice}
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">
          Status <span className="text-destructive">*</span>
        </Label>
        <div className="relative pb-5">
          <Select
            value={formData.status}
            onValueChange={(value: "active" | "draft") =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktivan</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="absolute left-0 top-full text-sm text-destructive">
              {errors.status}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Otkaži
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isDeleting || !hasChanges}
          >
            {isSubmitting ? "Čuvanje..." : submitLabel}
          </Button>
        </div>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSubmitting || isDeleting}
            className="hidden md:flex"
          >
            Obriši proizvod
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši proizvod</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete ovaj proizvod? Ova akcija
              se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
