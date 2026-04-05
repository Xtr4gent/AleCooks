import 'dotenv/config'

import { defineConfig } from 'prisma/config'

const runtimeNodeEnv = process.env.NODE_ENV ?? 'development'
const defaultDatasourceUrl =
  runtimeNodeEnv === 'development' || runtimeNodeEnv === 'test'
    ? 'postgresql://postgres:postgres@127.0.0.1:5432/alecooks?schema=public'
    : undefined

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatasourceUrl,
  },
})
