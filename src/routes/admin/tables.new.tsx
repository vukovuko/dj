import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { NumberInput } from "~/components/ui/number-input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { createTable, getTablesWithPagination } from "~/queries/tables.server";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/tables/new")({
  component: CreateTablePage,
});

function CreateTablePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [formData, setFormData] = useState({
    number: undefined as number | undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingNumbers, setExistingNumbers] = useState<Set<number>>(
    new Set(),
  );

  // Load existing table numbers on mount
  useEffect(() => {
    const loadExistingNumbers = async () => {
      try {
        const result = await getTablesWithPagination({ data: { page: 1 } });
        const numbers = new Set(result.tables.map((t) => t.number));

        // Load all pages to get all table numbers
        for (let page = 2; page <= result.totalPages; page++) {
          const pageResult = await getTablesWithPagination({ data: { page } });
          pageResult.tables.forEach((t) => numbers.add(t.number));
        }

        setExistingNumbers(numbers);
      } catch (error) {
        console.error("Failed to load existing table numbers:", error);
      }
    };
    loadExistingNumbers();
  }, []);

  // Validate in real-time as number changes or existing numbers load
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (isSubmitAttempted && formData.number === undefined) {
      newErrors.number = "Broj stola je obavezan";
    } else if (existingNumbers.has(formData.number!)) {
      newErrors.number = `Sto broj ${formData.number} već postoji`;
    }

    setErrors(newErrors);
  }, [formData.number, existingNumbers, isSubmitAttempted]);

  const getNextAvailableNumber = () => {
    let num = 1;
    while (existingNumbers.has(num)) {
      num++;
    }
    return num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);

    // Double-check validation before submitting
    if (formData.number === undefined || existingNumbers.has(formData.number)) {
      return;
    }

    try {
      setIsLoading(true);
      await createTable({
        data: {
          number: formData.number,
        },
      });
      toast.success("Sto je kreiran!");
      navigate({ to: "/admin/tables" });
    } catch (error) {
      console.error(error);
      toast.error("Greška pri kreiranju stola");
    } finally {
      setIsLoading(false);
    }
  };

  const isNumberTaken =
    formData.number !== undefined && existingNumbers.has(formData.number);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/admin/tables" })}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novi sto</h1>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="number">
              Broj stola <span className="text-destructive">*</span>
            </Label>
            <NumberInput
              stepper={1}
              min={1}
              decimalScale={0}
              placeholder="1, 2, 3..."
              value={formData.number}
              onValueChange={(value) =>
                setFormData({ ...formData, number: value })
              }
            />
            {errors.number && (
              <p className="text-sm text-destructive">{errors.number}</p>
            )}
          </div>

          {existingNumbers.size > 0 && (
            <p className="text-sm text-muted-foreground">
              Broj sledeceg slobodnog stola:{" "}
              <span className="font-semibold">{getNextAvailableNumber()}</span>
            </p>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/admin/tables" })}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                isNumberTaken ||
                formData.number === undefined ||
                errors.number !== undefined
              }
            >
              {isLoading ? "Kreiranje..." : "Kreiraj sto"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
