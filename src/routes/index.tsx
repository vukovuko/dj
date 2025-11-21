import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getTVDisplayProducts } from '~/queries/products.server'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface Product {
  id: string
  name: string
  categoryName: string | null
  currentPrice: string
  trend: 'up' | 'down'
}

export const Route = createFileRoute('/')({
  component: TVDisplay,
  loader: async () => {
    return await getTVDisplayProducts()
  },
})

function TVDisplay() {
  const initialData = Route.useLoaderData()
  const [products, setProducts] = useState(initialData)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Auto-refresh every 30 seconds - CHANGE THIS VALUE TO ADJUST TV DISPLAY REFRESH RATE
  const POLL_INTERVAL = 30 * 1000

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getTVDisplayProducts()
        setProducts(fresh)
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Failed to refresh TV display:', error)
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Group products by category
  const grouped = products.reduce(
    (acc, product) => {
      const cat = product.categoryName || 'Ostalo'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(product)
      return acc
    },
    {} as Record<string, Product[]>
  )

  const categories = Object.keys(grouped).sort()
  const leftCategory = categories[0]
  const rightCategory = categories[1]

  return (
    <div className="min-h-screen bg-neutral-900 text-gray-100 p-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-4 h-screen items-start">
        {/* Left */}
        {leftCategory && (
          <div>
            <h2 className="text-5xl font-black mb-2 text-center text-white py-4 px-6 rounded-lg uppercase tracking-wider shadow-lg" style={{ backgroundColor: '#06402B' }}>
              {leftCategory}
            </h2>
            <div className="space-y-4">
              {grouped[leftCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-6 py-5 rounded-lg shadow-lg ${
                    product.trend === 'up'
                      ? 'border-emerald-700 bg-emerald-800 shadow-emerald-400/30'
                      : 'border-red-500 shadow-red-400/30'
                  }`}
                  style={product.trend === 'down' ? { backgroundColor: 'rgb(189, 31, 31)' } : undefined}
                >
                  <h3 className="text-4xl font-black tracking-wide flex-1 text-white">{product.name.toUpperCase()}</h3>
                  <div className="flex items-center gap-6 ml-6">
                    <span className="text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())} RSD
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {product.trend === 'up' ? (
                        <ArrowUp className="w-8 h-8 text-emerald-500" strokeWidth={2} />
                      ) : (
                        <ArrowDown className="w-8 h-8 text-rose-500" strokeWidth={2} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right */}
        {rightCategory && (
          <div>
            <h2 className="text-5xl font-black mb-2 text-center text-white py-4 px-6 rounded-lg uppercase tracking-wider shadow-lg" style={{ backgroundColor: '#341539' }}>
              {rightCategory}
            </h2>
            <div className="space-y-4">
              {grouped[rightCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-6 py-5 rounded-lg shadow-lg ${
                    product.trend === 'up'
                      ? 'border-emerald-700 bg-emerald-800 shadow-emerald-400/30'
                      : 'border-red-500 shadow-red-400/30'
                  }`}
                  style={product.trend === 'down' ? { backgroundColor: 'rgb(189, 31, 31)' } : undefined}
                >
                  <h3 className="text-4xl font-black tracking-wide flex-1 text-white">{product.name.toUpperCase()}</h3>
                  <div className="flex items-center gap-6 ml-6">
                    <span className="text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())} RSD
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {product.trend === 'up' ? (
                        <ArrowUp className="w-8 h-8 text-emerald-500" strokeWidth={2} />
                      ) : (
                        <ArrowDown className="w-8 h-8 text-rose-500" strokeWidth={2} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
