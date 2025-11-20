import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { toast } from 'sonner'
import { createTable } from '~/queries/tables.server'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/admin/tables/new')({
  component: CreateTablePage,
})

function CreateTablePage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    number: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.number) {
      newErrors.number = 'Broj stola je obavestan'
    } else if (isNaN(Number(formData.number))) {
      newErrors.number = 'Broj stola mora biti broj'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)
      await createTable({
        data: {
          number: Number(formData.number),
        },
      })
      toast.success('Sto je kreiran!')
      navigate({ to: '/admin/tables' })
    } catch (error) {
      console.error(error)
      toast.error('Greška pri kreiranju stola')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/admin/tables' })}
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
            <Input
              id="number"
              type="number"
              placeholder="1, 2, 3..."
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className={errors.number ? 'border-destructive' : ''}
            />
            {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/admin/tables' })}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Kreiranje...' : 'Kreiraj sto'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
