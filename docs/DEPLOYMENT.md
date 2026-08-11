# AIBlog 部署与更新手册

本文记录 AIBlog 当前已经验证可用的免费部署方案，以及以后更新代码、修改 Payload 数据结构和排查部署故障时应执行的步骤。

## 当前部署信息

| 项目 | 当前配置 |
| --- | --- |
| 代码仓库 | `https://github.com/atlantis-mk/ai-blog`（私有仓库） |
| 生产站点 | `https://ai-blog-nu-sand.vercel.app` |
| 管理后台 | `https://ai-blog-nu-sand.vercel.app/admin` |
| 应用托管 | Vercel，项目名 `ai-blog`，Framework Preset 为 `Next.js` |
| 生产数据库 | Neon Postgres 免费方案，由 Vercel 集成注入连接变量 |
| 媒体文件 | Vercel Blob，由 Vercel 集成注入访问令牌 |
| 自动部署分支 | GitHub `main` |

生产环境不能使用本地 SQLite 文件。Vercel 的文件系统不是持久化数据库，本项目在 Vercel 环境中会强制要求 Postgres 和 Vercel Blob。

## 日常更新：最常用流程

普通页面、样式或业务代码更新，不涉及 Payload Collection、Field、Global 或插件结构变化时，按以下流程执行：

```bash
cd /Users/atlan/Documents/AIBlog
pnpm install
pnpm lint
pnpm build
git status --short
```

确认测试通过，并确认 `git status` 中只有本次准备发布的文件后，再提交和推送：

```bash
git add <本次需要发布的文件>
git commit -m "描述本次更新"
git push origin main
```

不要在工作区有其他未完成改动时直接使用 `git add .`。推送 `main` 后，Vercel 会自动创建 Production 部署，无需再手工导入项目。

查看部署状态：

```bash
pnpm dlx vercel ls ai-blog
```

看到最新生产部署为 `Ready` 后，检查：

```bash
curl -I https://ai-blog-nu-sand.vercel.app/
curl -I https://ai-blog-nu-sand.vercel.app/admin
curl https://ai-blog-nu-sand.vercel.app/api/users/me
```

最后在浏览器中实际打开首页和后台。仅有 HTTP 200 不代表后台 JavaScript 一定渲染成功。

## Payload 结构变化：必须增加的步骤

以下改动属于 Payload 结构变化：

- 新增、删除或修改 Collection、Global、Field、Block、索引或关系
- 修改认证 Collection
- 添加 Payload 管理后台组件或插件
- 修改 Vercel Blob 等存储插件配置

完成代码修改后，先生成类型和管理后台 import map：

```bash
pnpm generate:types
pnpm generate:importmap
```

将生成的 `src/payload-types.ts` 和 `src/app/(payload)/admin/importMap.js` 与代码一起检查并提交。

如果数据库结构发生变化，还必须创建迁移。项目维护两套迁移目录：

| 环境 | 数据库适配器 | 迁移目录 |
| --- | --- | --- |
| 本地默认环境 | SQLite | `src/migrations/` |
| Vercel 生产环境 | Postgres | `src/migrations-postgres/` |

创建 Postgres 迁移时，`POSTGRES_URL` 必须指向一个开发/测试 Postgres 数据库或 Neon 开发分支，不要直接用生产库试验结构变化：

```bash
POSTGRES_URL='postgresql://开发数据库连接' pnpm payload migrate:create
```

创建本地 SQLite 迁移时，确保没有设置 Postgres 连接：

```bash
POSTGRES_URL='file:./.db' DATABASE_URL='file:./.db' pnpm payload migrate:create
```

检查生成的 SQL/迁移代码，确认不会意外删除生产数据，然后一起提交。特别是删除字段、修改字段类型、修改唯一约束时，应先备份数据，并优先拆成兼容旧代码的多阶段迁移。

部署时 `vercel.json` 会执行：

```bash
pnpm run ci
```

而 `pnpm run ci` 当前依次执行：

1. `payload migrate`：应用 `src/migrations-postgres/` 中尚未执行的迁移。
2. `pnpm generate:importmap`：生成 Payload 管理后台组件映射。
3. `pnpm build`：构建 Next.js，并生成 sitemap。

注意：数据库迁移发生在应用构建之前。因此生产迁移必须尽量向后兼容，避免迁移成功但后续构建失败时，旧部署无法读取新数据库结构。

## 本地开发与生产数据库

本地默认配置使用 SQLite：

```env
DATABASE_URL=file:./.db
```

启动本地开发：

```bash
cp .env.example .env
pnpm install
pnpm dev
```

默认本地端口为 `http://localhost:3001`。如果需要使用已连接的 Vercel 开发环境变量：

```bash
pnpm dlx vercel link
pnpm dlx vercel env pull .env.local
```

`.env`、`.env.local` 和任何真实密钥都不能提交到 Git。

## Vercel 环境变量

Vercel 的 Production、Preview 和 Development 环境应配置以下变量：

| 变量 | 用途 | 来源 |
| --- | --- | --- |
| `POSTGRES_URL` 或 `DATABASE_URL` | Payload 生产数据库 | Neon 集成自动创建 |
| `BLOB_READ_WRITE_TOKEN` | 媒体文件持久化 | Vercel Blob 集成自动创建 |
| `PAYLOAD_SECRET` | Payload JWT 和加密 | 手工生成 |
| `CRON_SECRET` | Payload 定时任务鉴权 | 手工生成 |
| `PREVIEW_SECRET` | 草稿预览鉴权 | 手工生成 |
| `NEXT_PUBLIC_SERVER_URL` | 自定义正式域名，可选 | 有自定义域名时设置 |
| `MCP_ALLOWED_HOSTS` | 额外允许的 MCP Host，可选 | 逗号分隔 |
| `MCP_ALLOWED_ORIGINS` | 额外允许的 MCP Origin，可选 | 逗号分隔完整 URL |

生成随机密钥的示例：

```bash
openssl rand -hex 32
```

每个用途使用不同的随机值。不要在文档、提交记录、Issue 或聊天中粘贴真实值。

如果新增或修改环境变量，应在 Vercel 控制台保存后重新部署；已经完成的旧部署不会自动获得新的构建结果。

## 首次重新接入 Vercel

只有本机丢失 `.vercel` 关联、重新克隆仓库，或需要换电脑时才需要执行：

```bash
pnpm dlx vercel login
pnpm dlx vercel link
```

选择现有团队和现有项目 `ai-blog`，不要重复创建同名项目。随后可拉取开发环境变量：

```bash
pnpm dlx vercel env pull .env.local
```

确认 Vercel 项目设置：

- Git 仓库连接到 `atlantis-mk/ai-blog`。
- Production Branch 为 `main`。
- Framework Preset 为 `Next.js`。
- Build Command 由仓库中的 `vercel.json` 设置为 `pnpm run ci`。
- Neon 和 Blob 均已连接到 Production、Preview、Development。
- 如果网站需要公开访问，Deployment Protection 不应拦截生产域名。

必要时可以手工创建生产部署：

```bash
pnpm dlx vercel --prod
```

通常仍推荐通过 `git push origin main` 部署，这样 GitHub 提交和线上版本可以一一对应。

## 发布后的验收清单

每次生产更新至少检查以下项目：

- Vercel 最新部署状态为 `Ready`，不是 `Building` 或 `Error`。
- 首页能正常显示，不是 Vercel 404。
- `/admin` 能显示登录页或 Payload 仪表板，不是空白页面。
- `/api/users/me` 返回 JSON。
- 已发布文章页面和搜索页面能正常读取数据。
- 上传一张非敏感测试图片，确认文件进入 Vercel Blob，而不是仅写入临时文件系统。
- 涉及数据库结构的更新，确认 Vercel 构建日志中的 migration 已成功执行。
- 涉及自定义域名时，确认 sitemap、预览链接和 CORS 使用正确域名。

检查指定部署详情：

```bash
pnpm dlx vercel inspect <deployment-url>
```

## 常见故障

### Vercel 构建提示 `pnpm ci` 不存在

构建命令必须是：

```bash
pnpm run ci
```

`ci` 是本项目的 package script，不是 pnpm 自带子命令。

### 部署为 Ready，但访问网站是 404

检查 Vercel 的 Framework Preset 是否为 `Next.js`。设置为 `Other` 时可能产生没有 Next.js 路由的空部署。

### Payload 管理后台是空白页面

先运行并提交最新 import map：

```bash
pnpm generate:importmap
```

确认 `src/app/(payload)/admin/importMap.js` 中包含所有启用插件的客户端组件。Vercel Blob 启用时，应包含 `VercelBlobClientUploadHandler`。本项目的 `pnpm run ci` 已在构建前自动执行 import map 生成，不能从该脚本中删除这一步。

### Vercel 提示缺少数据库或 Blob 变量

检查 Neon 和 Blob 集成是否仍连接到当前 `ai-blog` 项目，并确认对应环境中存在：

```text
POSTGRES_URL（或 DATABASE_URL）
BLOB_READ_WRITE_TOKEN
```

本项目会在 Vercel 环境主动拒绝使用 SQLite 或没有 Blob 的部署，以防数据和图片在函数重启后丢失。

### 私有 GitHub 仓库因提交作者无法部署

确保本仓库的 Git 作者与有仓库权限的 GitHub 账号一致：

```bash
git config user.name "atlantis-mk"
git config user.email "185823991+atlantis-mk@users.noreply.github.com"
```

修改后需要创建一个新提交并推送，旧提交触发的部署不会因此自动变成可部署状态。

### 新部署失败，需要恢复旧版本

不要删除 Neon 数据库或 Blob 存储。先在 Vercel 的 Deployments 页面找到上一个状态为 `Ready` 的生产部署，将其重新提升为 Production。随后在新分支修复问题，验证通过后再推送 `main`。

如果失败发生在数据库迁移之后，单纯恢复旧应用可能不够。应根据迁移内容决定向前修复或执行经过审查的回滚迁移，不能直接删除 migration 记录或手工清空生产表。

## 发布前快速清单

```text
[ ] 只包含本次准备发布的代码
[ ] lint、类型检查和 build 通过
[ ] Payload 结构变化已生成 types 和 import map
[ ] 数据库结构变化已提交 Postgres migration
[ ] 破坏性 migration 已备份并审查
[ ] 没有提交 .env、令牌或数据库连接串
[ ] 已推送 main
[ ] Vercel 最新部署为 Ready
[ ] 首页、后台、API 和媒体上传已验证
```

