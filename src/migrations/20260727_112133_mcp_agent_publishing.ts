import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`agents_scopes\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`agents\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`agents_scopes_order_idx\` ON \`agents_scopes\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`agents_scopes_parent_idx\` ON \`agents_scopes\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`agents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`active\` integer DEFAULT true NOT NULL,
  	\`expires_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`agents_updated_at_idx\` ON \`agents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`agents_created_at_idx\` ON \`agents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mcp_audit_logs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`agent_id\` integer NOT NULL,
  	\`tool\` text NOT NULL,
  	\`post_id\` integer,
  	\`request_id\` text NOT NULL,
  	\`result\` text NOT NULL,
  	\`error_code\` text,
  	\`message\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`mcp_audit_logs_agent_idx\` ON \`mcp_audit_logs\` (\`agent_id\`);`)
  await db.run(sql`CREATE INDEX \`mcp_audit_logs_tool_idx\` ON \`mcp_audit_logs\` (\`tool\`);`)
  await db.run(sql`CREATE INDEX \`mcp_audit_logs_post_idx\` ON \`mcp_audit_logs\` (\`post_id\`);`)
  await db.run(
    sql`CREATE INDEX \`mcp_audit_logs_request_id_idx\` ON \`mcp_audit_logs\` (\`request_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`mcp_audit_logs_updated_at_idx\` ON \`mcp_audit_logs\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`mcp_audit_logs_created_at_idx\` ON \`mcp_audit_logs\` (\`created_at\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`posts\` ADD \`created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(sql`ALTER TABLE \`posts\` ADD \`reviewed_by_id\` integer REFERENCES users(id);`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`reviewed_at\` text;`)
  await db.run(
    sql`CREATE INDEX \`posts_created_by_agent_idx\` ON \`posts\` (\`created_by_agent_id\`);`,
  )
  await db.run(sql`CREATE INDEX \`posts_reviewed_by_idx\` ON \`posts\` (\`reviewed_by_id\`);`)
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_created_by_agent_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_reviewed_by_id\` integer REFERENCES users(id);`,
  )
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_reviewed_at\` text;`)
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_created_by_agent_idx\` ON \`_posts_v\` (\`version_created_by_agent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_reviewed_by_idx\` ON \`_posts_v\` (\`version_reviewed_by_id\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`agents_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mcp_audit_logs_id\` integer REFERENCES mcp_audit_logs(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_agents_id_idx\` ON \`payload_locked_documents_rels\` (\`agents_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_mcp_audit_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`mcp_audit_logs_id\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_preferences_rels\` ADD \`agents_id\` integer REFERENCES agents(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_agents_id_idx\` ON \`payload_preferences_rels\` (\`agents_id\`);`,
  )
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`DROP TABLE \`agents_scopes\`;`)
  await db.run(sql`DROP TABLE \`agents\`;`)
  await db.run(sql`DROP TABLE \`mcp_audit_logs\`;`)
  await db.run(sql`CREATE TABLE \`__new_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`hero_image_id\` integer,
  	\`content\` text,
  	\`ai_document_kind\` text DEFAULT 'runbook',
  	\`ai_document_status\` text DEFAULT 'draft',
  	\`ai_document_version\` text DEFAULT '1.0',
  	\`ai_document_compatibility\` text,
  	\`ai_document_risk_level\` text DEFAULT 'low',
  	\`ai_document_requires_approval\` integer DEFAULT false,
  	\`ai_document_verified_at\` text,
  	\`ai_document_markdown\` text DEFAULT '# 目标
  
  说明 AI 需要完成的结果。
  
  # 适用场景
  
  说明何时使用这份文档。
  
  # 前置条件
  
  - 列出所需环境、权限和依赖。
  
  # 输入
  
  - 列出执行所需的输入。
  
  # 约束
  
  - 列出不能改变的内容和安全边界。
  
  # 操作步骤
  
  ## 1. 第一步
  
  \`\`\`bash
  # command
  \`\`\`
  
  预期结果：
  
  # 验证方法
  
  说明如何确认任务已经正确完成。
  
  # 异常处理
  
  说明常见失败及处理方式。
  
  # 回滚方式
  
  说明如何安全恢复到操作前状态。
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
  	FOREIGN KEY (\`hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_posts\`("id", "title", "hero_image_id", "content", "ai_document_kind", "ai_document_status", "ai_document_version", "ai_document_compatibility", "ai_document_risk_level", "ai_document_requires_approval", "ai_document_verified_at", "ai_document_markdown", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status") SELECT "id", "title", "hero_image_id", "content", "ai_document_kind", "ai_document_status", "ai_document_version", "ai_document_compatibility", "ai_document_risk_level", "ai_document_requires_approval", "ai_document_verified_at", "ai_document_markdown", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status" FROM \`posts\`;`,
  )
  await db.run(sql`DROP TABLE \`posts\`;`)
  await db.run(sql`ALTER TABLE \`__new_posts\` RENAME TO \`posts\`;`)
  await db.run(sql`CREATE INDEX \`posts_hero_image_idx\` ON \`posts\` (\`hero_image_id\`);`)
  await db.run(sql`CREATE INDEX \`posts_meta_meta_image_idx\` ON \`posts\` (\`meta_image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`posts_updated_at_idx\` ON \`posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`posts_created_at_idx\` ON \`posts\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`posts__status_idx\` ON \`posts\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__posts_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_hero_image_id\` integer,
  	\`version_content\` text,
  	\`version_ai_document_kind\` text DEFAULT 'runbook',
  	\`version_ai_document_status\` text DEFAULT 'draft',
  	\`version_ai_document_version\` text DEFAULT '1.0',
  	\`version_ai_document_compatibility\` text,
  	\`version_ai_document_risk_level\` text DEFAULT 'low',
  	\`version_ai_document_requires_approval\` integer DEFAULT false,
  	\`version_ai_document_verified_at\` text,
  	\`version_ai_document_markdown\` text DEFAULT '# 目标
  
  说明 AI 需要完成的结果。
  
  # 适用场景
  
  说明何时使用这份文档。
  
  # 前置条件
  
  - 列出所需环境、权限和依赖。
  
  # 输入
  
  - 列出执行所需的输入。
  
  # 约束
  
  - 列出不能改变的内容和安全边界。
  
  # 操作步骤
  
  ## 1. 第一步
  
  \`\`\`bash
  # command
  \`\`\`
  
  预期结果：
  
  # 验证方法
  
  说明如何确认任务已经正确完成。
  
  # 异常处理
  
  说明常见失败及处理方式。
  
  # 回滚方式
  
  说明如何安全恢复到操作前状态。
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new__posts_v\`("id", "parent_id", "version_title", "version_hero_image_id", "version_content", "version_ai_document_kind", "version_ai_document_status", "version_ai_document_version", "version_ai_document_compatibility", "version_ai_document_risk_level", "version_ai_document_requires_approval", "version_ai_document_verified_at", "version_ai_document_markdown", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_title", "version_hero_image_id", "version_content", "version_ai_document_kind", "version_ai_document_status", "version_ai_document_version", "version_ai_document_compatibility", "version_ai_document_risk_level", "version_ai_document_requires_approval", "version_ai_document_verified_at", "version_ai_document_markdown", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_posts_v\`;`,
  )
  await db.run(sql`DROP TABLE \`_posts_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__posts_v\` RENAME TO \`_posts_v\`;`)
  await db.run(sql`CREATE INDEX \`_posts_v_parent_idx\` ON \`_posts_v\` (\`parent_id\`);`)
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_hero_image_idx\` ON \`_posts_v\` (\`version_hero_image_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_meta_version_meta_image_idx\` ON \`_posts_v\` (\`version_meta_image_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_slug_idx\` ON \`_posts_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_updated_at_idx\` ON \`_posts_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version_created_at_idx\` ON \`_posts_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_version__status_idx\` ON \`_posts_v\` (\`version__status\`);`,
  )
  await db.run(sql`CREATE INDEX \`_posts_v_created_at_idx\` ON \`_posts_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_updated_at_idx\` ON \`_posts_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_latest_idx\` ON \`_posts_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_autosave_idx\` ON \`_posts_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`pages_id\` integer,
  	\`posts_id\` integer,
  	\`products_id\` integer,
  	\`releases_id\` integer,
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
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`releases_id\`) REFERENCES \`releases\`(\`id\`) ON UPDATE no action ON DELETE cascade,
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
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "pages_id", "posts_id", "products_id", "releases_id", "media_id", "categories_id", "users_id", "redirects_id", "forms_id", "form_submissions_id", "search_id", "payload_folders_id") SELECT "id", "order", "parent_id", "path", "pages_id", "posts_id", "products_id", "releases_id", "media_id", "categories_id", "users_id", "redirects_id", "forms_id", "form_submissions_id", "search_id", "payload_folders_id" FROM \`payload_locked_documents_rels\`;`,
  )
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(
    sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`,
  )
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
    sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_releases_id_idx\` ON \`payload_locked_documents_rels\` (\`releases_id\`);`,
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
  await db.run(sql`CREATE TABLE \`__new_payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_payload_preferences_rels\`("id", "order", "parent_id", "path", "users_id") SELECT "id", "order", "parent_id", "path", "users_id" FROM \`payload_preferences_rels\`;`,
  )
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(
    sql`ALTER TABLE \`__new_payload_preferences_rels\` RENAME TO \`payload_preferences_rels\`;`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`,
  )
  await db.run(sql`PRAGMA foreign_keys=ON;`)
}
