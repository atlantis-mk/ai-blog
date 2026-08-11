import * as migration_20260715_130138 from './20260715_130138'
import * as migration_20260722_042459_add_ai_document from './20260722_042459_add_ai_document'
import * as migration_20260722_044105_add_products_and_releases from './20260722_044105_add_products_and_releases'
import * as migration_20260727_053215_add_blob_prefix from './20260727_053215_add_blob_prefix'
import * as migration_20260727_112133_mcp_agent_publishing from './20260727_112133_mcp_agent_publishing'
import * as migration_20260729_091440_mcp_software_publishing from './20260729_091440_mcp_software_publishing'

export const migrations = [
  {
    up: migration_20260715_130138.up,
    down: migration_20260715_130138.down,
    name: '20260715_130138',
  },
  {
    up: migration_20260722_042459_add_ai_document.up,
    down: migration_20260722_042459_add_ai_document.down,
    name: '20260722_042459_add_ai_document',
  },
  {
    up: migration_20260722_044105_add_products_and_releases.up,
    down: migration_20260722_044105_add_products_and_releases.down,
    name: '20260722_044105_add_products_and_releases',
  },
  {
    up: migration_20260727_053215_add_blob_prefix.up,
    down: migration_20260727_053215_add_blob_prefix.down,
    name: '20260727_053215_add_blob_prefix',
  },
  {
    up: migration_20260727_112133_mcp_agent_publishing.up,
    down: migration_20260727_112133_mcp_agent_publishing.down,
    name: '20260727_112133_mcp_agent_publishing',
  },
  {
    up: migration_20260729_091440_mcp_software_publishing.up,
    down: migration_20260729_091440_mcp_software_publishing.down,
    name: '20260729_091440_mcp_software_publishing',
  },
]
