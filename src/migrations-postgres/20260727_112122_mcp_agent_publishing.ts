import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agents_scopes" AS ENUM('posts:read', 'posts:write', 'posts:publish');
  CREATE TYPE "public"."enum_mcp_audit_logs_result" AS ENUM('success', 'error');
  CREATE TABLE "agents_scopes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agents_scopes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"active" boolean DEFAULT true NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  CREATE TABLE "mcp_audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"agent_id" integer NOT NULL,
  	"tool" varchar NOT NULL,
  	"post_id" integer,
  	"request_id" varchar NOT NULL,
  	"result" "enum_mcp_audit_logs_result" NOT NULL,
  	"error_code" varchar,
  	"message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "posts" ADD COLUMN "created_by_agent_id" integer;
  ALTER TABLE "posts" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "posts" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_created_by_agent_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewed_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agents_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mcp_audit_logs_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "agents_id" integer;
  ALTER TABLE "agents_scopes" ADD CONSTRAINT "agents_scopes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "agents_scopes_order_idx" ON "agents_scopes" USING btree ("order");
  CREATE INDEX "agents_scopes_parent_idx" ON "agents_scopes" USING btree ("parent_id");
  CREATE INDEX "agents_updated_at_idx" ON "agents" USING btree ("updated_at");
  CREATE INDEX "agents_created_at_idx" ON "agents" USING btree ("created_at");
  CREATE INDEX "mcp_audit_logs_agent_idx" ON "mcp_audit_logs" USING btree ("agent_id");
  CREATE INDEX "mcp_audit_logs_tool_idx" ON "mcp_audit_logs" USING btree ("tool");
  CREATE INDEX "mcp_audit_logs_post_idx" ON "mcp_audit_logs" USING btree ("post_id");
  CREATE INDEX "mcp_audit_logs_request_id_idx" ON "mcp_audit_logs" USING btree ("request_id");
  CREATE INDEX "mcp_audit_logs_updated_at_idx" ON "mcp_audit_logs" USING btree ("updated_at");
  CREATE INDEX "mcp_audit_logs_created_at_idx" ON "mcp_audit_logs" USING btree ("created_at");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_created_by_agent_id_agents_id_fk" FOREIGN KEY ("version_created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mcp_audit_logs_fk" FOREIGN KEY ("mcp_audit_logs_id") REFERENCES "public"."mcp_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_created_by_agent_idx" ON "posts" USING btree ("created_by_agent_id");
  CREATE INDEX "posts_reviewed_by_idx" ON "posts" USING btree ("reviewed_by_id");
  CREATE INDEX "_posts_v_version_version_created_by_agent_idx" ON "_posts_v" USING btree ("version_created_by_agent_id");
  CREATE INDEX "_posts_v_version_version_reviewed_by_idx" ON "_posts_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "payload_locked_documents_rels_agents_id_idx" ON "payload_locked_documents_rels" USING btree ("agents_id");
  CREATE INDEX "payload_locked_documents_rels_mcp_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("mcp_audit_logs_id");
  CREATE INDEX "payload_preferences_rels_agents_id_idx" ON "payload_preferences_rels" USING btree ("agents_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_created_by_agent_id_agents_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_created_by_agent_id_agents_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agents_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mcp_audit_logs_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_agents_fk";
  
  DROP INDEX "posts_created_by_agent_idx";
  DROP INDEX "posts_reviewed_by_idx";
  DROP INDEX "_posts_v_version_version_created_by_agent_idx";
  DROP INDEX "_posts_v_version_version_reviewed_by_idx";
  DROP INDEX "payload_locked_documents_rels_agents_id_idx";
  DROP INDEX "payload_locked_documents_rels_mcp_audit_logs_id_idx";
  DROP INDEX "payload_preferences_rels_agents_id_idx";
  ALTER TABLE "posts" DROP COLUMN "created_by_agent_id";
  ALTER TABLE "posts" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "posts" DROP COLUMN "reviewed_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_created_by_agent_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewed_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewed_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agents_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mcp_audit_logs_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "agents_id";
  ALTER TABLE "mcp_audit_logs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents_scopes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "mcp_audit_logs" CASCADE;
  DROP TABLE "agents_scopes" CASCADE;
  DROP TABLE "agents" CASCADE;
  DROP TYPE "public"."enum_agents_scopes";
  DROP TYPE "public"."enum_mcp_audit_logs_result";`)
}
