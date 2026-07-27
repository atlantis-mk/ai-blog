import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`products_platforms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`products_platforms_order_idx\` ON \`products_platforms\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`products_platforms_parent_id_idx\` ON \`products_platforms\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`products_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_links_order_idx\` ON \`products_links\` (\`_order\`);`)
  await db.run(
    sql`CREATE INDEX \`products_links_parent_id_idx\` ON \`products_links\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`products_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`image_id\` integer,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`products_features_order_idx\` ON \`products_features\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`products_features_parent_id_idx\` ON \`products_features\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`products_features_image_idx\` ON \`products_features\` (\`image_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`products_capability_groups_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products_capability_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`products_capability_groups_items_order_idx\` ON \`products_capability_groups_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`products_capability_groups_items_parent_id_idx\` ON \`products_capability_groups_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`products_capability_groups\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`products_capability_groups_order_idx\` ON \`products_capability_groups\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`products_capability_groups_parent_id_idx\` ON \`products_capability_groups\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`products\` (
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
  await db.run(sql`CREATE INDEX \`products_logo_idx\` ON \`products\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`products_hero_image_idx\` ON \`products\` (\`hero_image_id\`);`)
  await db.run(
    sql`CREATE INDEX \`products_meta_meta_image_idx\` ON \`products\` (\`meta_image_id\`);`,
  )
  await db.run(sql`CREATE UNIQUE INDEX \`products_slug_idx\` ON \`products\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`products_updated_at_idx\` ON \`products\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`products_created_at_idx\` ON \`products\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`products__status_idx\` ON \`products\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_version_platforms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_platforms_order_idx\` ON \`_products_v_version_platforms\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_platforms_parent_id_idx\` ON \`_products_v_version_platforms\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_products_v_version_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_links_order_idx\` ON \`_products_v_version_links\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_links_parent_id_idx\` ON \`_products_v_version_links\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_products_v_version_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`image_id\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_features_order_idx\` ON \`_products_v_version_features\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_features_parent_id_idx\` ON \`_products_v_version_features\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_features_image_idx\` ON \`_products_v_version_features\` (\`image_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_products_v_version_capability_groups_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v_version_capability_groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_capability_groups_items_order_idx\` ON \`_products_v_version_capability_groups_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_capability_groups_items_parent_id_idx\` ON \`_products_v_version_capability_groups_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_products_v_version_capability_groups\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_capability_groups_order_idx\` ON \`_products_v_version_capability_groups\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_capability_groups_parent_id_idx\` ON \`_products_v_version_capability_groups\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_products_v\` (
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
  await db.run(sql`CREATE TABLE \`releases\` (
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
  await db.run(sql`CREATE INDEX \`releases_product_idx\` ON \`releases\` (\`product_id\`);`)
  await db.run(sql`CREATE INDEX \`releases_file_idx\` ON \`releases\` (\`file_id\`);`)
  await db.run(sql`CREATE INDEX \`releases_updated_at_idx\` ON \`releases\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`releases_created_at_idx\` ON \`releases\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`releases__status_idx\` ON \`releases\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_releases_v\` (
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
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`products_id\` integer REFERENCES products(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`releases_id\` integer REFERENCES releases(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_releases_id_idx\` ON \`payload_locked_documents_rels\` (\`releases_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`products_platforms\`;`)
  await db.run(sql`DROP TABLE \`products_links\`;`)
  await db.run(sql`DROP TABLE \`products_features\`;`)
  await db.run(sql`DROP TABLE \`products_capability_groups_items\`;`)
  await db.run(sql`DROP TABLE \`products_capability_groups\`;`)
  await db.run(sql`DROP TABLE \`products\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_platforms\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_links\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_features\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_capability_groups_items\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_capability_groups\`;`)
  await db.run(sql`DROP TABLE \`_products_v\`;`)
  await db.run(sql`DROP TABLE \`releases\`;`)
  await db.run(sql`DROP TABLE \`_releases_v\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`pages_id\` integer,
  	\`posts_id\` integer,
  	\`media_id\` integer,
  	\`categories_id\` integer,
  	\`users_id\` integer,
  	\`redirects_id\` integer,
  	\`forms_id\` integer,
  	\`form_submissions_id\` integer,
  	\`search_id\` integer,
  	\`payload_folders_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`redirects_id\`) REFERENCES \`redirects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`forms_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`form_submissions_id\`) REFERENCES \`form_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`search_id\`) REFERENCES \`search\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_folders_id\`) REFERENCES \`payload_folders\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "pages_id", "posts_id", "media_id", "categories_id", "users_id", "redirects_id", "forms_id", "form_submissions_id", "search_id", "payload_folders_id") SELECT "id", "order", "parent_id", "path", "pages_id", "posts_id", "media_id", "categories_id", "users_id", "redirects_id", "forms_id", "form_submissions_id", "search_id", "payload_folders_id" FROM \`payload_locked_documents_rels\`;`,
  )
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(
    sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`,
  )
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_redirects_id_idx\` ON \`payload_locked_documents_rels\` (\`redirects_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_forms_id_idx\` ON \`payload_locked_documents_rels\` (\`forms_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_form_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`form_submissions_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_search_id_idx\` ON \`payload_locked_documents_rels\` (\`search_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_payload_folders_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_folders_id\`);`,
  )
}
