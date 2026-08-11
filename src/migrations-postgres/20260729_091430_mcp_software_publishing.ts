import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'products:read';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'products:write';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'products:publish';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'releases:read';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'releases:write';
  ALTER TYPE "public"."enum_agents_scopes" ADD VALUE 'releases:publish';
  ALTER TABLE "products" ADD COLUMN "created_by_agent_id" integer;
  ALTER TABLE "products" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "products" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "_products_v" ADD COLUMN "version_created_by_agent_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_reviewed_by_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "releases" ADD COLUMN "created_by_agent_id" integer;
  ALTER TABLE "_releases_v" ADD COLUMN "version_created_by_agent_id" integer;
  ALTER TABLE "products" ADD CONSTRAINT "products_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_created_by_agent_id_agents_id_fk" FOREIGN KEY ("version_created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_created_by_agent_id_agents_id_fk" FOREIGN KEY ("version_created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_created_by_agent_idx" ON "products" USING btree ("created_by_agent_id");
  CREATE INDEX "products_reviewed_by_idx" ON "products" USING btree ("reviewed_by_id");
  CREATE INDEX "_products_v_version_version_created_by_agent_idx" ON "_products_v" USING btree ("version_created_by_agent_id");
  CREATE INDEX "_products_v_version_version_reviewed_by_idx" ON "_products_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "releases_created_by_agent_idx" ON "releases" USING btree ("created_by_agent_id");
  CREATE INDEX "_releases_v_version_version_created_by_agent_idx" ON "_releases_v" USING btree ("version_created_by_agent_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP CONSTRAINT "products_created_by_agent_id_agents_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_created_by_agent_id_agents_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_created_by_agent_id_agents_id_fk";
  
  ALTER TABLE "_releases_v" DROP CONSTRAINT "_releases_v_version_created_by_agent_id_agents_id_fk";
  
  DELETE FROM "agents_scopes" WHERE "value" IN ('products:read', 'products:write', 'products:publish', 'releases:read', 'releases:write', 'releases:publish');
  ALTER TABLE "agents_scopes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_agents_scopes";
  CREATE TYPE "public"."enum_agents_scopes" AS ENUM('posts:read', 'posts:write', 'posts:publish');
  ALTER TABLE "agents_scopes" ALTER COLUMN "value" SET DATA TYPE "public"."enum_agents_scopes" USING "value"::"public"."enum_agents_scopes";
  DROP INDEX "products_created_by_agent_idx";
  DROP INDEX "products_reviewed_by_idx";
  DROP INDEX "_products_v_version_version_created_by_agent_idx";
  DROP INDEX "_products_v_version_version_reviewed_by_idx";
  DROP INDEX "releases_created_by_agent_idx";
  DROP INDEX "_releases_v_version_version_created_by_agent_idx";
  ALTER TABLE "products" DROP COLUMN "created_by_agent_id";
  ALTER TABLE "products" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "products" DROP COLUMN "reviewed_at";
  ALTER TABLE "_products_v" DROP COLUMN "version_created_by_agent_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_reviewed_by_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_reviewed_at";
  ALTER TABLE "releases" DROP COLUMN "created_by_agent_id";
  ALTER TABLE "_releases_v" DROP COLUMN "version_created_by_agent_id";`)
}
