import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_kind\` text DEFAULT 'runbook';`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_status\` text DEFAULT 'draft';`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_version\` text DEFAULT '1.0';`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_compatibility\` text;`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_risk_level\` text DEFAULT 'low';`)
  await db.run(
    sql`ALTER TABLE \`posts\` ADD \`ai_document_requires_approval\` integer DEFAULT false;`,
  )
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_verified_at\` text;`)
  await db.run(sql`ALTER TABLE \`posts\` ADD \`ai_document_markdown\` text DEFAULT '# 目标
  
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
  ';`)
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_kind\` text DEFAULT 'runbook';`,
  )
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_status\` text DEFAULT 'draft';`,
  )
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_version\` text DEFAULT '1.0';`,
  )
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_compatibility\` text;`)
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_risk_level\` text DEFAULT 'low';`,
  )
  await db.run(
    sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_requires_approval\` integer DEFAULT false;`,
  )
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_verified_at\` text;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_ai_document_markdown\` text DEFAULT '# 目标
  
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
  ';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_kind\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_status\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_version\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_compatibility\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_risk_level\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_requires_approval\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_verified_at\`;`)
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`ai_document_markdown\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_kind\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_status\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_version\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_compatibility\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_risk_level\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_requires_approval\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_verified_at\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_ai_document_markdown\`;`)
}
