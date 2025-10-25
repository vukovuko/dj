import { createFileRoute } from '@tanstack/react-router'
import { NotFound } from '~/components/not-found'

export const Route = createFileRoute('/$')({
  component: NotFound,
})
