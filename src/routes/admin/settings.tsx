import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Podešavanja</h1>
      <p className="text-sm text-muted-foreground">
        Sistemska podešavanja
      </p>
    </div>
  )
}
