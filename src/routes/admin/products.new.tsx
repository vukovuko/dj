import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ProductForm, type ProductFormData } from "~/components/products/product-form"
import { ProductPageHeader } from "~/components/products/product-page-header"
import { toast } from "sonner"
import { createProduct, getCategories } from "~/queries/products.server"

export const Route = createFileRoute("/admin/products/new")({
  component: NewProductPage,
  loader: async () => {
    const categories = await getCategories()
    return { categories }
  },
})

function NewProductPage() {
  const navigate = useNavigate()
  const { categories } = Route.useLoaderData()

  const handleSubmit = async (data: ProductFormData) => {
    try {
      await createProduct({ data })

      toast.success("Proizvod je uspešno kreiran!")
      navigate({ to: "/admin/products/" })
    } catch (error) {
      toast.error("Greška pri kreiranju proizvoda")
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: "/admin/products/" })
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <ProductPageHeader title="Dodaj novi proizvod" onBack={handleCancel} />
      </div>

      <div className="border rounded-lg p-6">
        <ProductForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Kreiraj proizvod"
        />
      </div>
    </div>
  )
}
