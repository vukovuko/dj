import pkg from 'graphile-worker'
const { run, makeWorkerUtils } = pkg
import env from '../../env.ts'
import generateVideoTask from '../jobs/generate-video.ts'
import updatePricesTask from '../jobs/update-prices.ts'
import { db } from '../db/index.ts'
import { settings } from '../db/schema.ts'
import { eq } from 'drizzle-orm'

// ========== CONFIGURATION ==========
// Get price update interval from database or use default
async function getPriceUpdateIntervalMs(): Promise<number> {
  try {
    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'priceUpdateIntervalMinutes'))
      .limit(1)

    const minutes = result[0]?.value?.minutes ?? 1
    return minutes * 60 * 1000
  } catch (error) {
    console.error('Failed to get price update interval from database, using default 1 minute:', error)
    return 1 * 60 * 1000
  }
}

// Worker configuration with inline task list (TypeScript support)
const workerOptions = {
  connectionString: env.DATABASE_URL,
  concurrency: 5,
  noHandleSignals: false,
  pollInterval: 1000,
  // Register tasks directly (TypeScript support)
  taskList: {
    'generate-video': generateVideoTask,
    'update-prices': updatePricesTask,
  },
}

// Start the worker
export async function startWorker() {
  console.log('🔧 Starting Graphile Worker...')

  const runner = await run(workerOptions)

  console.log('✅ Graphile Worker started with tasks:', Object.keys(workerOptions.taskList).join(', '))

  try {
    // Schedule first job to run immediately
    const utils = await getWorkerUtils()
    await utils.addJob('update-prices', {}, { runAt: new Date() })
    console.log('📊 Scheduled price update job to run immediately')

    // Set up recurring schedule - get interval from database
    const intervalMs = await getPriceUpdateIntervalMs()
    const intervalMinutes = intervalMs / (60 * 1000)
    console.log(`⏰ Price update interval set to ${intervalMinutes} minute(s)`)

    setInterval(async () => {
      try {
        await utils.addJob('update-prices', {}, { runAt: new Date() })
        console.log('📊 Scheduled next price update job')
      } catch (error) {
        console.error('❌ Failed to schedule price update job:', error)
      }
    }, intervalMs)

    // Reload interval every 30 minutes in case it was changed in admin panel
    setInterval(async () => {
      const newIntervalMs = await getPriceUpdateIntervalMs()
      const newIntervalMinutes = newIntervalMs / (60 * 1000)
      console.log(`⏰ Price update interval reloaded from database: ${newIntervalMinutes} minute(s)`)
    }, 30 * 60 * 1000)
  } catch (error) {
    console.error('⚠️ Failed to schedule recurring price update:', error)
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📛 SIGTERM received, shutting down worker...')
    await runner.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('📛 SIGINT received, shutting down worker...')
    await runner.stop()
    process.exit(0)
  })

  return runner
}

// Worker utils for queueing jobs
export async function getWorkerUtils() {
  return await makeWorkerUtils({
    connectionString: env.DATABASE_URL,
  })
}
