import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: TVDisplay,
})

function TVDisplay() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">
          TV Displej
        </h1>
        <p className="text-xl text-muted-foreground">
          Dobrodošli u kafeteriju
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          (WebSocket data će biti prikazan ovde)
        </p>
      </div>
    </div>
  )
}
