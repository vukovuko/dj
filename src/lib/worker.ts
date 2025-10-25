import pkg from 'graphile-worker'
const { run, makeWorkerUtils } = pkg
import env from '../../env.ts'
import generateVideoTask from '../jobs/generate-video.ts'

// Worker configuration with inline task list (TypeScript support)
const workerOptions = {
  connectionString: env.DATABASE_URL,
  concurrency: 5,
  noHandleSignals: false,
  pollInterval: 1000,
  // Register tasks directly (TypeScript support)
  taskList: {
    'generate-video': generateVideoTask,
  },
}

// Start the worker
export async function startWorker() {
  console.log('🔧 Starting Graphile Worker...')

  const runner = await run(workerOptions)

  console.log('✅ Graphile Worker started with tasks:', Object.keys(workerOptions.taskList).join(', '))

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
