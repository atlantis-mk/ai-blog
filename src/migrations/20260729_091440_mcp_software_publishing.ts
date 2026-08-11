import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.run(
    sql`ALTER TABLE \`products\` ADD \`created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(sql`ALTER TABLE \`products\` ADD \`reviewed_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`products\` ADD \`reviewed_at\` text;`)
  await db.run(
    sql`CREATE INDEX \`products_created_by_agent_idx\` ON \`products\` (\`created_by_agent_id\`);`,
  )
  await db.run(sql`CREATE INDEX \`products_reviewed_by_idx\` ON \`products\` (\`reviewed_by_id\`);`)
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD \`version_created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD \`version_reviewed_by_id\` integer REFERENCES users(id);`,
  )
  await db.run(sql`ALTER TABLE \`_products_v\` ADD \`version_reviewed_at\` text;`)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_created_by_agent_idx\` ON \`_products_v\` (\`version_created_by_agent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_reviewed_by_idx\` ON \`_products_v\` (\`version_reviewed_by_id\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`releases\` ADD \`created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`releases_created_by_agent_idx\` ON \`releases\` (\`created_by_agent_id\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`_releases_v\` ADD \`version_created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version_created_by_agent_idx\` ON \`_releases_v\` (\`version_created_by_agent_id\`);`,
  )
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_products\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`tagline\` text,
  	\`summary\` text,
  	\`logo_id\` integer,
  	\`hero_image_id\` integer,
  	\`additional_content\` text,
  	\`install_document_status\` text DEFAULT 'draft',
  	\`install_document_version\` text DEFAULT '1.0',
  	\`install_document_risk_level\` text DEFAULT 'low',
  	\`install_document_requires_approval\` integer DEFAULT false,
  	\`install_document_verified_at\` text,
  	\`install_document_markdown\` text DEFAULT '# 安装目标
  
  说明需要安装的产品和完成后的状态。
  
  # 系统要求
  
  - 列出支持的操作系统、架构、磁盘空间和权限。
  
  # 安装步骤
  
  ## 1. 下载安装包
  
  只使用文档 frontmatter 中的官方下载地址。
  
  ## 2. 安装产品
  
  说明具体安装步骤。
  
  # 首次运行
  
  说明第一次启动、授权和基础配置方法。
  
  # 验证方法
  
  说明如何确认产品已经正确安装并可以运行。
  
  # 常见问题
  
  列出安装或启动时的常见问题和解决方法。
  
  # 卸载或回滚
  
  说明如何安全卸载产品或恢复安装前状态。
  ',
  	\`meta_title\` text,
  	\`meta_image_id\` integer,
  	\`meta_description\` text,
  	\`published_at\` text,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_products\`("id", "title", "tagline", "summary", "logo_id", "hero_image_id", "additional_content", "install_document_status", "install_document_version", "install_document_risk_level", "install_document_requires_approval", "install_document_verified_at", "install_document_markdown", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status") SELECT "id", "title", "tagline", "summary", "logo_id", "hero_image_id", "additional_content", "install_document_status", "install_document_version", "install_document_risk_level", "install_document_requires_approval", "install_document_verified_at", "install_document_markdown", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status" FROM \`products\`;`,
  )
  await db.run(sql`DROP TABLE \`products\`;`)
  await db.run(sql`ALTER TABLE \`__new_products\` RENAME TO \`products\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`products_logo_idx\` ON \`products\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`products_hero_image_idx\` ON \`products\` (\`hero_image_id\`);`)
  await db.run(
    sql`CREATE INDEX \`products_meta_meta_image_idx\` ON \`products\` (\`meta_image_id\`);`,
  )
  await db.run(sql`CREATE UNIQUE INDEX \`products_slug_idx\` ON \`products\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`products_updated_at_idx\` ON \`products\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`products_created_at_idx\` ON \`products\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`products__status_idx\` ON \`products\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__products_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_tagline\` text,
  	\`version_summary\` text,
  	\`version_logo_id\` integer,
  	\`version_hero_image_id\` integer,
  	\`version_additional_content\` text,
  	\`version_install_document_status\` text DEFAULT 'draft',
  	\`version_install_document_version\` text DEFAULT '1.0',
  	\`version_install_document_risk_level\` text DEFAULT 'low',
  	\`version_install_document_requires_approval\` integer DEFAULT false,
  	\`version_install_document_verified_at\` text,
  	\`version_install_document_markdown\` text DEFAULT '# 安装目标
  
  说明需要安装的产品和完成后的状态。
  
  # 系统要求
  
  - 列出支持的操作系统、架构、磁盘空间和权限。
  
  # 安装步骤
  
  ## 1. 下载安装包
  
  只使用文档 frontmatter 中的官方下载地址。
  
  ## 2. 安装产品
  
  说明具体安装步骤。
  
  # 首次运行
  
  说明第一次启动、授权和基础配置方法。
  
  # 验证方法
  
  说明如何确认产品已经正确安装并可以运行。
  
  # 常见问题
  
  列出安装或启动时的常见问题和解决方法。
  
  # 卸载或回滚
  
  说明如何安全卸载产品或恢复安装前状态。
  ',
  	\`version_meta_title\` text,
  	\`version_meta_image_id\` integer,
  	\`version_meta_description\` text,
  	\`version_published_at\` text,
  	\`version_generate_slug\` integer DEFAULT true,
  	\`version_slug\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new__products_v\`("id", "parent_id", "version_title", "version_tagline", "version_summary", "version_logo_id", "version_hero_image_id", "version_additional_content", "version_install_document_status", "version_install_document_version", "version_install_document_risk_level", "version_install_document_requires_approval", "version_install_document_verified_at", "version_install_document_markdown", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_title", "version_tagline", "version_summary", "version_logo_id", "version_hero_image_id", "version_additional_content", "version_install_document_status", "version_install_document_version", "version_install_document_risk_level", "version_install_document_requires_approval", "version_install_document_verified_at", "version_install_document_markdown", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_products_v\`;`,
  )
  await db.run(sql`DROP TABLE \`_products_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__products_v\` RENAME TO \`_products_v\`;`)
  await db.run(sql`CREATE INDEX \`_products_v_parent_idx\` ON \`_products_v\` (\`parent_id\`);`)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_logo_idx\` ON \`_products_v\` (\`version_logo_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_hero_image_idx\` ON \`_products_v\` (\`version_hero_image_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_meta_version_meta_image_idx\` ON \`_products_v\` (\`version_meta_image_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_slug_idx\` ON \`_products_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_updated_at_idx\` ON \`_products_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_created_at_idx\` ON \`_products_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version__status_idx\` ON \`_products_v\` (\`version__status\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_created_at_idx\` ON \`_products_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_updated_at_idx\` ON \`_products_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE INDEX \`_products_v_latest_idx\` ON \`_products_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_autosave_idx\` ON \`_products_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`__new_releases\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`product_id\` integer,
  	\`version\` text,
  	\`channel\` text DEFAULT 'stable',
  	\`released_at\` text,
  	\`file_id\` integer,
  	\`download_u_r_l\` text,
  	\`file_size\` text,
  	\`architecture\` text,
  	\`system_requirements\` text,
  	\`checksum_algorithm\` text DEFAULT 'sha256',
  	\`checksum\` text,
  	\`changelog_u_r_l\` text,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_releases\`("id", "product_id", "version", "channel", "released_at", "file_id", "download_u_r_l", "file_size", "architecture", "system_requirements", "checksum_algorithm", "checksum", "changelog_u_r_l", "notes", "updated_at", "created_at", "_status") SELECT "id", "product_id", "version", "channel", "released_at", "file_id", "download_u_r_l", "file_size", "architecture", "system_requirements", "checksum_algorithm", "checksum", "changelog_u_r_l", "notes", "updated_at", "created_at", "_status" FROM \`releases\`;`,
  )
  await db.run(sql`DROP TABLE \`releases\`;`)
  await db.run(sql`ALTER TABLE \`__new_releases\` RENAME TO \`releases\`;`)
  await db.run(sql`CREATE INDEX \`releases_product_idx\` ON \`releases\` (\`product_id\`);`)
  await db.run(sql`CREATE INDEX \`releases_file_idx\` ON \`releases\` (\`file_id\`);`)
  await db.run(sql`CREATE INDEX \`releases_updated_at_idx\` ON \`releases\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`releases_created_at_idx\` ON \`releases\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`releases__status_idx\` ON \`releases\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__releases_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_product_id\` integer,
  	\`version_version\` text,
  	\`version_channel\` text DEFAULT 'stable',
  	\`version_released_at\` text,
  	\`version_file_id\` integer,
  	\`version_download_u_r_l\` text,
  	\`version_file_size\` text,
  	\`version_architecture\` text,
  	\`version_system_requirements\` text,
  	\`version_checksum_algorithm\` text DEFAULT 'sha256',
  	\`version_checksum\` text,
  	\`version_changelog_u_r_l\` text,
  	\`version_notes\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`releases\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new__releases_v\`("id", "parent_id", "version_product_id", "version_version", "version_channel", "version_released_at", "version_file_id", "version_download_u_r_l", "version_file_size", "version_architecture", "version_system_requirements", "version_checksum_algorithm", "version_checksum", "version_changelog_u_r_l", "version_notes", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_product_id", "version_version", "version_channel", "version_released_at", "version_file_id", "version_download_u_r_l", "version_file_size", "version_architecture", "version_system_requirements", "version_checksum_algorithm", "version_checksum", "version_changelog_u_r_l", "version_notes", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_releases_v\`;`,
  )
  await db.run(sql`DROP TABLE \`_releases_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__releases_v\` RENAME TO \`_releases_v\`;`)
  await db.run(sql`CREATE INDEX \`_releases_v_parent_idx\` ON \`_releases_v\` (\`parent_id\`);`)
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version_product_idx\` ON \`_releases_v\` (\`version_product_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version_file_idx\` ON \`_releases_v\` (\`version_file_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version_updated_at_idx\` ON \`_releases_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version_created_at_idx\` ON \`_releases_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_version_version__status_idx\` ON \`_releases_v\` (\`version__status\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_created_at_idx\` ON \`_releases_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_releases_v_updated_at_idx\` ON \`_releases_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE INDEX \`_releases_v_latest_idx\` ON \`_releases_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_releases_v_autosave_idx\` ON \`_releases_v\` (\`autosave\`);`)
}
