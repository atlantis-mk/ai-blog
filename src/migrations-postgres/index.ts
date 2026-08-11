import * as migration_20260727_053151_initial_postgres from './20260727_053151_initial_postgres'
import * as migration_20260727_112122_mcp_agent_publishing from './20260727_112122_mcp_agent_publishing'
import * as migration_20260729_091430_mcp_software_publishing from './20260729_091430_mcp_software_publishing'

export const migrations = [
  {
    up: migration_20260727_053151_initial_postgres.up,
    down: migration_20260727_053151_initial_postgres.down,
    name: '20260727_053151_initial_postgres',
  },
  {
    up: migration_20260727_112122_mcp_agent_publishing.up,
    down: migration_20260727_112122_mcp_agent_publishing.down,
    name: '20260727_112122_mcp_agent_publishing',
  },
  {
    up: migration_20260729_091430_mcp_software_publishing.up,
    down: migration_20260729_091430_mcp_software_publishing.down,
    name: '20260729_091430_mcp_software_publishing',
  },
]
