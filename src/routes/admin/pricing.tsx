import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/pricing')({
  component: PricingPage,
})

function PricingPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Cene</h1>
      <p className="text-sm text-muted-foreground">
        Upravljanje cenama
      </p>
    </div>
  )
}
