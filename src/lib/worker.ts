import pkg from 'graphile-worker'
const { run, makeWorkerUtils } = pkg
import env from '../../env.ts'
import generateVideoTask from '../jobs/generate-video.ts'
import updatePricesTask from '../jobs/update-prices.ts'

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

  // Schedule recurring price update job (every 10 minutes = 600,000 ms)
  const PRICE_UPDATE_INTERVAL = 10 * 60 * 1000 // 10 minutes

  try {
    const utils = await getWorkerUtils()

    // Schedule first job to run immediately
    await utils.addJob('update-prices', {}, { runAt: new Date() })
    console.log('📊 Scheduled price update job to run immediately')

    // Set up recurring schedule (every 10 minutes)
    setInterval(async () => {
      try {
        await utils.addJob('update-prices', {}, { runAt: new Date() })
        console.log('📊 Scheduled next price update job')
      } catch (error) {
        console.error('❌ Failed to schedule price update job:', error)
      }
    }, PRICE_UPDATE_INTERVAL)

    await utils.release()
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
