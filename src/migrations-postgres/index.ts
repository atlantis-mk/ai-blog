import * as migration_20260727_053151_initial_postgres from './20260727_053151_initial_postgres'

export const migrations = [
  {
    up: migration_20260727_053151_initial_postgres.up,
    down: migration_20260727_053151_initial_postgres.down,
    name: '20260727_053151_initial_postgres',
  },
]
