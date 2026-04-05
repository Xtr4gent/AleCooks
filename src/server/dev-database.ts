import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { Client } from 'pg'

import { env } from './env.js'

const execAsync = promisify(exec)

function getDatabaseName(databaseUrl: string) {
  const url = new URL(databaseUrl)
  return url.pathname.replace(/^\//, '')
}

function createAdminDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  url.pathname = '/postgres'
  return url.toString()
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

async function ensureDatabaseExists() {
  const databaseName = getDatabaseName(env.DATABASE_URL)
  const adminClient = new Client({
    connectionString: createAdminDatabaseUrl(env.DATABASE_URL),
  })

  await adminClient.connect()

  try {
    const result = await adminClient.query<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
      [databaseName],
    )

    if (!result.rows[0]?.exists) {
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
      console.log(`Created local PostgreSQL database "${databaseName}" for AleCooks.`)
    }
  } finally {
    await adminClient.end()
  }
}

async function runMigrations() {
  await execAsync('npm run db:deploy', {
    cwd: process.cwd(),
    env: process.env,
  })
}

export async function ensureDevDatabaseReady() {
  if (env.NODE_ENV === 'production') {
    return
  }

  await ensureDatabaseExists()
  await runMigrations()
}
