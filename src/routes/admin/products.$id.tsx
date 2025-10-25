import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { ProductForm, type ProductFormData } from "~/components/products/product-form"
import { ProductPageHeader } from "~/components/products/product-page-header"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { toast } from "sonner"
import { getProductById, updateProduct, deleteProduct, getCategories } from "~/queries/products.server"
import { useState } from "react"
import { Trash2 } from "lucide-react"

export const Route = createFileRoute("/admin/products/$id")({
  component: EditProductPage,
  loader: async ({ params }) => {
    const [product, categories] = await Promise.all([
      getProductById({ data: { id: params.id } }),
      getCategories(),
    ])
    return { product, categories }
  },
})

function EditProductPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { id } = Route.useParams()
  const { product, categories } = Route.useLoaderData()

  const [currentName, setCurrentName] = useState(product.name)
  const [showMobileDeleteDialog, setShowMobileDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const initialData: ProductFormData = {
    name: product.name,
    categoryId: product.categoryId,
    basePrice: parseFloat(product.basePrice),
    minPrice: parseFloat(product.minPrice),
    maxPrice: parseFloat(product.maxPrice),
    status: product.status,
  }

  const handleSubmit = async (data: ProductFormData) => {
    try {
      await updateProduct({
        data: {
          id,
          ...data,
        },
      })

      setCurrentName(data.name)
      toast.success("Proizvod je uspešno ažuriran!")
      router.invalidate()
    } catch (error) {
      toast.error("Greška pri ažuriranju proizvoda")
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: "/admin/products/" })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteProduct({ data: { id } })

      toast.success("Proizvod je uspešno obrisan!")
      setShowMobileDeleteDialog(false)
      navigate({ to: "/admin/products/" })
    } catch (error) {
      toast.error("Greška pri brisanju proizvoda")
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl relative">
      <div className="flex items-center justify-between mb-6">
        <ProductPageHeader title={currentName} onBack={handleCancel} />

        {/* Floating delete button - mobile only */}
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setShowMobileDeleteDialog(true)}
          className="md:hidden h-9 w-9 rounded-full"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg p-6">
        <ProductForm
          initialData={initialData}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={handleDelete}
          submitLabel="Ažuriraj proizvod"
        />
      </div>

      {/* Mobile Delete Confirmation Dialog */}
      <Dialog open={showMobileDeleteDialog} onOpenChange={setShowMobileDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši proizvod</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite da obrišete ovaj proizvod? Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMobileDeleteDialog(false)}
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
    </div>
  )
}
