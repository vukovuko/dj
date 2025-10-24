import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/products')({
  component: ProductsPage,
})

function ProductsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Proizvodi</h1>
      <p className="text-sm text-muted-foreground">
        Lista proizvoda
      </p>
    </div>
  )
}
