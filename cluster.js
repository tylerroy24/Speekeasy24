/**
 * cluster.js -- Speekeasy cluster manager
 *
 * Spawns one worker process per CPU core for horizontal load balancing.
 * Each worker runs a full instance of server.js.
 * The OS kernel handles round-robin distribution of incoming connections.
 *
 * Usage:
 *   node cluster.js               # Uses all CPU cores
 *   WORKERS=4 node cluster.js     # Uses 4 workers
 *   NODE_ENV=production node cluster.js
 */

import cluster from 'cluster'
import os from 'os'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKERS = parseInt(process.env.WORKERS) || os.cpus().length
const IS_PROD = process.env.NODE_ENV === 'production'

if (cluster.isPrimary) {
  console.log('\n  Speekeasy Cluster Manager')
  console.log('  Mode: ' + (IS_PROD ? 'PRODUCTION' : 'development'))
  console.log('  CPUs: ' + os.cpus().length)
  console.log('  Workers: ' + WORKERS)
  console.log('  PID: ' + process.pid + '\n')

  // Fork one worker per CPU core
  for (let i = 0; i < WORKERS; i++) {
    const worker = cluster.fork()
    console.log('  Worker ' + worker.process.pid + ' started')
  }

  // Auto-restart crashed workers
  cluster.on('exit', (worker, code, signal) => {
    console.log('\n  Worker ' + worker.process.pid + ' died (code: ' + code + ', signal: ' + signal + ')')
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log('  Restarting worker...')
      const newWorker = cluster.fork()
      console.log('  New worker ' + newWorker.process.pid + ' started\n')
    }
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n  SIGTERM received -- shutting down gracefully')
    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown')
    }
    setTimeout(() => {
      console.log('  Force shutdown after timeout')
      process.exit(0)
    }, 10000)
  })

  process.on('SIGINT', () => {
    console.log('\n  SIGINT received -- shutting down')
    for (const id in cluster.workers) {
      cluster.workers[id].kill()
    }
    process.exit(0)
  })

  // Log cluster stats every 60 seconds in production
  if (IS_PROD) {
    setInterval(() => {
      const workerCount = Object.keys(cluster.workers).length
      console.log('  [cluster] ' + workerCount + ' workers active, uptime: ' + Math.floor(process.uptime() / 60) + 'm')
    }, 60000)
  }
} else {
  // Worker process -- run the actual server
  import('./server.js')
}
