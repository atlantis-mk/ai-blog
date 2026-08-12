import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN "ai_document_prompt" varchar;
    ALTER TABLE "_posts_v" ADD COLUMN "version_ai_document_prompt" varchar;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN "ai_document_prompt";
    ALTER TABLE "_posts_v" DROP COLUMN "version_ai_document_prompt";`)
}
