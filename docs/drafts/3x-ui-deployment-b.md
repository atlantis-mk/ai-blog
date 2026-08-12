# 前置条件与一次性授权

用户只需在一条消息中提供 `SSH_TARGET`（非 22 端口时再提供 `SSH_PORT`），并明确要求“按本文执行完整部署”。这句话同时表示：用户确认对目标 VPS 拥有合法管理权限，并一次性授权本文默认方案所需的只读检查、安装软件、配置 3x-ui、UFW、Fail2ban、NAT 和 BBR、重启本次新增或修改的服务，以及在失败时执行本文规定的局部回滚。Agent 不得把这些已合并授权的阶段再次拆成多轮确认。

账号、密码、API Token、SSH 私钥、UUID、REALITY 私钥和 Hysteria2 认证值均不得通过聊天提供。SSH 必须使用本机已有密钥或 SSH Agent。用户仍应确保云厂商控制台、串口或救援模式可用，以便 SSH 或防火墙异常时恢复访问。

首次连接到全新主机时，Agent 可以使用 OpenSSH 的 `accept-new` 语义记录新主机密钥，并在验收报告中给出指纹；已记录主机的密钥发生变化时必须停止，不能自动覆盖 `known_hosts`。以下情况才允许中断一次性执行并向用户提问：

- SSH 无法认证、目标身份存在歧义或已记录的主机密钥不匹配。
- 只读侦察发现会覆盖既有业务、数据、同名服务或不明防火墙策略，且无法通过改用空闲端口安全规避。
- 用户明确选择了 `public_https` 或 Hysteria2，但其必需域名不存在、未解析到该 VPS，或证书无法签发。未明确选择时必须使用下方默认降级方案，不能因此阻塞基础安装。
- 官方安装器、已安装版本或当前核心明确不支持该系统/架构/配置，继续执行会造成不可逆风险。

除上述硬阻塞外，Agent 应采用本文默认值继续执行，把推断值、跳过的可选能力和验证结果写入最终报告，不要仅因用户没有逐项填写配置表而暂停。

# 目标

在一台由用户合法控制的 Linux VPS 上部署 3x-ui，并完成可验证、可回滚的节点配置。基础方案创建第一个入站，满足条件时再创建第二个：

1. VLESS + TCP + REALITY + Vision，使用 TCP 443。
2. 可选的 Hysteria2 + TLS + UDP 端口跳跃；只有用户在首条消息中提供有效域名或明确启用时才创建。

同时完成面板访问策略、系统防火墙、Fail2ban、TCP BBR 和端到端连接验证；TLS 与端口跳跃仅在启用 Hysteria2 或公网面板时配置。最终交付脱敏的验收报告；所有账号、密码、API Token、UUID、REALITY 私钥、公钥、Short ID、Hysteria2 认证信息和导入链接写入权限为 `0600` 的服务器文件，不在聊天、公开日志或文章中输出。

# 适用场景

- 用户拥有 VPS、域名和相关账号的明确管理权限。
- 服务器为干净或可安全变更的 Debian 12/13、Ubuntu 22.04/24.04，使用 systemd；其他新版 Debian/Ubuntu 只有在当前 3x-ui 官方安装器明确支持且依赖检查通过时才继续。
- 需要 3x-ui 管理面板以及 VLESS REALITY 节点。
- 可选创建 Hysteria2 节点和 UDP 端口跳跃。
- 允许 Agent 使用 SSH 执行系统级变更，并已通过首条消息给予本文范围内的一次性合并授权。

不适用于未获授权的服务器、已存在复杂生产业务但无法确认端口占用的主机、不能修改防火墙的环境，或云服务商明确禁止相关用途的实例。

# 输入与自动默认值

执行前从用户消息、SSH 配置和只读侦察中解析输入，并回显脱敏后的配置摘要。只有 `SSH_TARGET` 无法从当前会话或 SSH 配置确定时才提问；其他未提供项按表中默认值推断，不得暂停。

最短的一次性执行请求示例：

```text
请按本文在 root@203.0.113.10 上完成部署；使用安全默认值，允许安装依赖、配置防火墙/BBR 并重启本次相关服务。
```

| 变量 | 是否必须由用户提供 | 自动值或说明 |
| --- | --- | --- |
| `SSH_TARGET` | 是 | `root@<SERVER_IP>`，也可使用 SSH 配置中的主机别名 |
| `SSH_PORT` | 否 | 优先读取 SSH 配置或当前连接，无法读取时为 `22` |
| `PANEL_MODE` | 否 | 默认 `tunnel`；只有用户明确要求并提供有效域名时才用 `public_https` |
| `PANEL_DOMAIN` | 仅明确选择公网面板时 | 未提供时保持 `tunnel`，不阻塞安装 |
| `PANEL_PORT` | 否 | 公网模式下自动选择未占用的 `10000-65535/tcp` 高位端口 |
| `NODE_ADDRESS` | 否 | 优先使用已正确解析的节点域名，否则使用服务器公网 IPv4；不使用私网地址 |
| `REALITY_PORT` | 否 | 默认 `443/tcp`；冲突时自动选择未占用高位 TCP 端口并记录 |
| `REALITY_TARGET` | 否 | Agent 从当前可达的常见 TLS 站点中选择并验证 TLS 1.3、证书和 SNI，不通过则换候选，不向用户追问 |
| `REALITY_SNI` | 否 | 从验证通过的 `REALITY_TARGET` 主机名推导 |
| `ENABLE_HYSTERIA2` | 否 | 默认 `false`；提供 `HYSTERIA2_DOMAIN` 或明确要求时为 `true` |
| `HYSTERIA2_DOMAIN` | 仅明确启用时 | 必须解析到 VPS 且可签发有效证书；否则基础部署继续、Hysteria2 标记为跳过 |
| `HYSTERIA2_PORT` | 否 | 默认 `443/udp`；可与 TCP 443 共存，冲突时选空闲高位 UDP 端口 |
| `HYSTERIA2_HOP_RANGE` | 否 | 启用时默认从未占用高位 UDP 区间选择连续 101 个端口 |
| `HYSTERIA2_HOP_INTERVAL` | 否 | 启用时默认 `5-10` 秒，若当前核心格式不同则采用其官方默认值 |
| `ENABLE_KERNEL_BBR` | 否 | 默认 `true`；内核不支持时跳过并报告，不阻塞基础安装 |
| `CLIENT_NAME_PREFIX` | 否 | 默认 `xui-<主机名>`，清洗为字母、数字、点、短横线和下划线 |

# 约束

1. 这是高风险系统变更。用户要求按本文完整部署即构成一次性合并授权；执行前一次性说明计划、影响、端口矩阵和回滚位置，此后连续执行，不再按阶段索要确认。公开面板、修改 SSH 登录策略、整机重启和覆盖既有业务不包含在默认授权中，除非用户首条消息明确要求。
2. 只使用 3x-ui 官方仓库、官方安装脚本和当前版本官方文档。下载脚本到临时文件后再执行，记录来源和获取时间；不要从第三方博客复制安装命令。
3. 先做只读侦察。已有 3x-ui/Xray 数据、同名服务或会被覆盖的生产业务属于硬阻塞；仅发现 Nginx、Caddy、Docker、UFW、nftables、iptables 时先备份并判断是否实际冲突。无冲突则合并本次最小规则继续执行，目标端口冲突则优先改用空闲端口，不因工具“已安装但未占用”而停止。
4. 永远先保留 SSH 通道，再启用防火墙。默认不修改 SSH 登录方式、不关闭 root 登录、不删除现有公钥。
5. 不在命令行参数、聊天内容、进程列表或世界可读文件中暴露秘密。秘密文件必须由 root 拥有且权限为 `0600`。
6. 不把 REALITY 私钥写入客户端；客户端只使用公钥。不要把面板 API Token 或管理密码写进分享链接。
7. 不盲目复用旧版 3x-ui JSON。创建入站前读取已安装版本，并以该版本的官方 API 文档、面板生成的同类配置或 `/panel/api/inbounds` 返回结构为准。
8. `PANEL_MODE=tunnel` 时，面板只能监听 `127.0.0.1`，不得开放面板端口。`PANEL_MODE=public_https` 时，只允许有效 HTTPS，不得暴露明文 HTTP 登录页。
9. 防火墙只开放实际使用的端口。面板端口、节点端口和跳跃端口必须分别说明协议是 TCP 还是 UDP。
10. Hysteria2 端口跳跃采用“单一 UDP 入站监听端口 + NAT 转发跳跃范围”的方式。不要假定配置了 `udpHop` 就会自动监听整个范围。
11. 任何验收失败都不能标记为完成。必须定位到 DNS、路由、防火墙、TLS、认证、客户端选中状态或核心兼容性中的具体层级。
12. 不承诺 BBR 或端口跳跃一定提升速度。只报告配置状态和实测数据。

# 操作步骤

## 1. 建立 SSH 会话并完成只读侦察

在本地使用已存在的 SSH 密钥连接。全新目标可接受并记录首次出现的主机密钥；已知目标的密钥不匹配时按“硬阻塞”停止。

```bash
ssh -o StrictHostKeyChecking=accept-new -p "${SSH_PORT}" "${SSH_TARGET}"
```

在服务器执行以下只读检查：

```bash
set -eu
id
uname -a
cat /etc/os-release
df -h /
free -h
timedatectl status
systemctl is-system-running || true
ss -lntup
systemctl status x-ui --no-pager || true
command -v ufw >/dev/null && ufw status verbose || true
command -v nft >/dev/null && nft list ruleset || true
command -v iptables >/dev/null && iptables-save || true
```

确认以下事项后再继续：

- 系统和架构受当前 3x-ui 官方安装器支持。Debian 13 不得仅因本文旧版本白名单而拒绝；应先检查安装器的发行版判断与所需软件包，检查通过即继续。
- 根分区空间充足，系统时间正确。
- SSH 当前端口和来源地址明确。
- TCP 443、UDP 443、面板端口和 UDP 跳跃范围没有冲突；仅有目标端口冲突且无既有数据覆盖风险时，按输入表自动改用空闲高位端口。
- 不存在会被本次操作覆盖的 3x-ui 数据库或同名 systemd 服务。

如果已经安装 3x-ui，先备份 `/etc/x-ui/`、服务环境文件、证书路径和相关防火墙规则，再将任务改为“升级或修复”，不得按全新安装继续。

## 2. 验证 DNS 与端口规划

从本地和服务器分别解析域名，确认 A/AAAA 记录与实际地址一致。

```bash
getent ahosts "${PANEL_DOMAIN}" || true
getent ahosts "${HYSTERIA2_DOMAIN}" || true
```

如果使用 Cloudflare 等 DNS 服务，确认记录为 DNS Only。若解析尚未传播：

- REALITY 分享地址自动使用服务器公网 IP，并在报告中注明。
- 用户未明确要求公网面板或 Hysteria2 时，自动保持 `tunnel` 并跳过 Hysteria2；用户明确要求时才按“硬阻塞”暂停相关可选步骤。

在开始变更前展示最终端口矩阵，作为一次性计划摘要的一部分；无需再次等待确认：

| 用途 | 协议 | 默认端口 |
| --- | --- | --- |
| SSH | TCP | 用户当前 SSH 端口 |
| VLESS REALITY | TCP | 443 |
| Hysteria2 | UDP | 443 |
| Hysteria2 跳跃 | UDP | 用户提供或自动选择的空闲范围 |
| 3x-ui 公网面板 | TCP | 仅 `public_https` 模式开放 |

## 3. 安装依赖并获取官方安装脚本

Debian/Ubuntu 示例：

```bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl jq openssl ufw iptables
```

将官方脚本下载到临时目录，确认 URL、文件类型和首部内容。不要把脚本重定向后直接静默执行。

```bash
install_script="$(mktemp /tmp/3x-ui-install.XXXXXX.sh)"
curl --fail --location --silent --show-error \
  'https://raw.githubusercontent.com/MHSanaei/3x-ui/master/install.sh' \
  --output "${install_script}"
chmod 0700 "${install_script}"
file "${install_script}"
sed -n '1,40p' "${install_script}"
sha256sum "${install_script}"
```

记录 SHA-256 仅用于本次审计，不要把它当成官方固定校验值。一次性计划摘要中说明脚本将安装并启用 systemd 服务，然后连续执行。

## 4. 非交互安装 3x-ui

当前官方安装器支持非交互模式，并将随机生成的安装信息写入 `/etc/x-ui/install-result.env`。

```bash
XUI_NONINTERACTIVE=1 bash "${install_script}"
systemctl enable x-ui
systemctl restart x-ui
systemctl status x-ui --no-pager
```

验证安装结果文件的所有者和权限；如果权限不是 `0600`，立即修正。

```bash
test -s /etc/x-ui/install-result.env
chown root:root /etc/x-ui/install-result.env
chmod 0600 /etc/x-ui/install-result.env
```

读取变量时只在 root shell 内加载，不要执行 `cat` 将完整内容输出到聊天：

```bash
set -a
. /etc/x-ui/install-result.env
set +a
```

记录 3x-ui 与 Xray-core 的实际版本、服务状态和面板监听地址。不要在报告中显示用户名、密码或 API Token 的原值。`tunnel` 模式的 WebBasePath 只用于生成下方要求的本地访问地址，不得写入公开日志或文章。

## 5. 配置面板访问模式

### 5.1 SSH 隧道模式

将面板监听地址限制为回环，并重启服务：

```bash
/usr/local/x-ui/x-ui setting -listenIP '127.0.0.1'
systemctl restart x-ui
ss -lntp | grep -F ":${XUI_PANEL_PORT}" || true
```

本地访问命令使用安装器生成的真实端口：

```bash
ssh -N -p "${SSH_PORT}" \
  -L "127.0.0.1:${XUI_PANEL_PORT}:127.0.0.1:${XUI_PANEL_PORT}" \
  "${SSH_TARGET}"
```

浏览器只访问本机回环地址和完整 WebBasePath。系统防火墙和云安全组都不得开放该面板端口。

配置完成后，AI 必须在最终私密交付回复中把变量替换为实际值，输出以下两项：

1. 一条可直接复制执行的 SSH 隧道命令，包括实际 SSH 目标、SSH 端口、本地端口和服务器面板端口。
2. 完整的本地访问地址，例如 `http://127.0.0.1:<本地端口>/<真实 WebBasePath>/`。

命令和访问地址不得包含用户名、密码、API Token 或其他认证信息。如果本机端口与服务器面板端口不同，必须明确标注，不得要求用户自行推断。

最终回复使用以下格式，并以实际值替换尖括号内容：

```text
SSH 隧道命令：
ssh -N -p <SSH端口> -L 127.0.0.1:<本地端口>:127.0.0.1:<服务器面板端口> <SSH目标>

面板访问地址：
http://127.0.0.1:<本地端口>/<真实WebBasePath>/
```

### 5.2 公网 HTTPS 模式

只有用户在首条消息中明确选择 `public_https` 时才执行；其他情况自动使用 SSH 隧道。先确认域名解析正确、证书签发条件满足，再使用 `x-ui` 管理菜单或当前版本官方证书命令申请并配置证书。

公网暴露的影响已包含在首条消息的明确选择中，不再索要阶段确认。完成后必须满足：

- 面板使用随机用户名、强密码和随机 WebBasePath。
- TLS 证书的主机名、有效期和链校验正确。
- HTTP 不承载登录页；如存在 HTTP，只允许重定向到 HTTPS。
- 只开放指定的高位 TCP 面板端口。
- 登录后启用 2FA。

用不含凭据的请求验证 TLS 和状态码：

```bash
curl --fail --silent --show-error --head \
  "https://${PANEL_DOMAIN}:${PANEL_PORT}/" >/dev/null
openssl s_client \
  -connect "${PANEL_DOMAIN}:${PANEL_PORT}" \
  -servername "${PANEL_DOMAIN}" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

不要在验证命令或报告中拼接用户名和密码。真实 WebBasePath 仅可按 SSH 隧道模式的交付要求出现在当前用户的私密回复中，不得进入公开日志或文章。

## 6. 创建 VLESS REALITY 入站

先从服务器验证 `REALITY_TARGET`：

```bash
target_host="${REALITY_TARGET%:*}"
openssl s_client \
  -connect "${REALITY_TARGET}" \
  -servername "${REALITY_SNI}" \
  -alpn h2 </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

目标站点必须支持合适的 TLS 握手，SNI 必须与证书匹配。不要使用从服务器不可达或经常被劫持的目标。

使用随 3x-ui 安装的 Xray 二进制生成 x25519 密钥对，使用系统 CSPRNG 生成 UUID、Short ID 和订阅 ID。私钥只保留在服务器端。

```bash
xray_bin="$(find /usr/local/x-ui -type f -name 'xray-*' -perm -0100 | head -n 1)"
test -n "${xray_bin}"
"${xray_bin}" x25519
cat /proc/sys/kernel/random/uuid
openssl rand -hex 8
openssl rand -hex 8
```

不要依赖输出行号盲目判断公钥和私钥名称；先读取当前 Xray 输出标签再解析。

通过本机回环面板 API 创建入站。API 基础路径为当前安装的 WebBasePath 加 `/panel/api/inbounds`，使用 Bearer Token 或登录会话。请求体以当前版本官方入站 API 和同版本面板生成的 VLESS REALITY 配置为准，至少包含：

- 入站启用，备注使用 `CLIENT_NAME_PREFIX`。
- 协议 `vless`，监听 TCP `REALITY_PORT`。
- 客户端 UUID、Email/备注、`xtls-rprx-vision` 和启用状态。
- 解密与加密字段使用当前版本对 VLESS 的合法值。
- 传输使用 TCP/RAW，无额外 HTTP Header。
- 安全类型 `reality`。
- `target`、`serverNames`、x25519 私钥、Short ID 和指纹。
- `minClientVer` 先按当前官方默认值；只有服务端日志证明确为兼容问题时，才调整到当前官方文档允许且与验收客户端匹配的明确最低版本，并在报告中记录，不得取消版本约束。
- 分享地址使用 `NODE_ADDRESS`，但 REALITY SNI 始终使用 `REALITY_SNI`。

API 返回必须同时满足 HTTP 成功状态和响应体中的业务成功标记。创建后重新读取入站，比较端口、协议、客户端、REALITY 公钥对应关系和启用状态。任何字段不一致都先删除本次新建入站或按原值修正，不能继续配置防火墙。

## 7. 创建 Hysteria2 入站与证书

仅当 `ENABLE_HYSTERIA2=true` 时执行。先确保域名证书已成功签发并能被当前用户读取。证书私钥权限不得放宽为世界可读。

通过当前版本面板 API 创建 Hysteria2 入站，至少满足：

- 协议使用当前 Xray-core 要求的 Hysteria v2 表示法。
- 服务端只监听 `HYSTERIA2_PORT/udp`。
- 使用强随机认证值，不与面板密码或其他节点复用。
- TLS 1.3，SNI 为 `HYSTERIA2_DOMAIN`，ALPN 包含 `h3`。
- 证书链和私钥路径正确。
- QUIC 拥塞控制及 `udpHop.ports`、`udpHop.interval` 放在当前 Xray-core 版本要求的 `finalmask.quicParams` 中。

创建后先验证 Xray 配置能够加载、UDP 443 正在监听，再进入端口跳跃配置。若当前核心不支持所需字段，停止并报告兼容性，不要通过删字段伪装成功。

## 8. 配置并持久化 UDP 端口跳跃

在一次性计划摘要中展示将要增加的 NAT 规则和 systemd 服务，并说明它会接管指定 UDP 端口范围；确认范围空闲后直接执行。

创建 root 拥有、不可由普通用户修改的脚本，例如 `/usr/local/sbin/hysteria2-port-hop`。脚本必须支持 `start`、`stop`、`restart`，增加规则前先用 `iptables -t nat -C` 检查，停止时循环删除带唯一 comment 的同一条规则，确保幂等。

规则语义如下，变量替换为经过验证的纯数字端口：

```bash
iptables -t nat -A PREROUTING \
  -p udp --dport "${HOP_START}:${HOP_END}" \
  -m comment --comment 'hysteria2-port-hop' \
  -j REDIRECT --to-ports "${HYSTERIA2_PORT}"
```

创建 oneshot systemd 单元，设置 `RemainAfterExit=yes`，在网络、UFW 和 `x-ui.service` 之后运行；`ExecStop` 必须删除同一条规则。然后执行：

```bash
systemctl daemon-reload
systemctl enable --now hysteria2-port-hop.service
systemctl status hysteria2-port-hop.service --no-pager
iptables -t nat -C PREROUTING \
  -p udp --dport "${HOP_START}:${HOP_END}" \
  -m comment --comment 'hysteria2-port-hop' \
  -j REDIRECT --to-ports "${HYSTERIA2_PORT}"
```

如果系统实际使用 nftables 后端，先确认 `iptables` 与 nftables 的兼容层和持久化顺序。不要同时维护两套会重复匹配的规则。

## 9. 配置 UFW 与云安全组

先放行当前 SSH 端口，再添加节点规则。只有 `public_https` 模式才开放面板端口。

```bash
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow "${REALITY_PORT}/tcp" comment 'VLESS REALITY'
```

启用 Hysteria2 时：

```bash
ufw allow "${HYSTERIA2_PORT}/udp" comment 'Hysteria2'
ufw allow "${HOP_START}:${HOP_END}/udp" comment 'Hysteria2 port hopping'
```

公网 HTTPS 面板模式：

```bash
ufw allow "${PANEL_PORT}/tcp" comment '3x-ui HTTPS panel'
```

检查规则后再启用：

```bash
ufw status numbered
ufw --force enable
ufw status verbose
```

系统防火墙完成后，逐项复核云安全组与端口矩阵是否一致。Agent 能访问当前目标所属云账号的 API 时，可在一次性授权范围内只增补本次必需规则；无法访问云 API 时，通过外部连通性测试判断。若系统本地配置和服务验证均通过但云侧端口仍被阻断，将安装报告标记为“服务端安装完成，公网验收受云安全组阻塞”，给出唯一待办，不回退已经安全完成的基础安装。

## 10. 检查 Fail2ban

确认 3x-ui 安装器是否已经启用 Fail2ban。若未启用，按照当前 3x-ui 官方说明配置，不覆盖用户现有 jail。

```bash
systemctl enable --now fail2ban
systemctl status fail2ban --no-pager
fail2ban-client status
```

不要为了让状态显示正常而创建无法实际执行封禁的空规则。本手册默认原生 systemd 安装；检测到只能采用容器部署时，将其视为超出默认方案的硬阻塞，不自动切换部署形态。

## 11. 启用 Linux 内核 TCP BBR

仅当 `ENABLE_KERNEL_BBR=true` 时执行。先确认内核支持并记录当前值：

```bash
uname -r
sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control
sysctl net.core.default_qdisc
```

写入独立配置文件，避免覆盖其他 sysctl：

```bash
printf '%s\n' \
  'net.core.default_qdisc=fq' \
  'net.ipv4.tcp_congestion_control=bbr' \
  > /etc/sysctl.d/99-bbr.conf
printf '%s\n' 'tcp_bbr' > /etc/modules-load.d/bbr.conf
modprobe tcp_bbr
sysctl --system
```

验证：

```bash
sysctl net.ipv4.tcp_congestion_control
sysctl net.core.default_qdisc
lsmod | grep -E '^tcp_bbr\b'
```

注意：这是内核 TCP BBR，与 Hysteria2/QUIC 配置中的拥塞控制不是同一层。

## 12. 生成客户端配置但不泄露秘密

在服务器上生成权限为 `0600` 的交付文件，例如 `/root/3x-ui-delivery.env` 和 `/root/3x-ui-client-links.txt`。内容可以包含：

- 面板完整地址、用户名和密码。
- VLESS 客户端 UUID、REALITY 公钥、Short ID、SNI、指纹、Flow 和导入链接。
- Hysteria2 认证值、域名、基础 UDP 端口、跳跃范围、间隔、SNI、ALPN 和导入链接。

```bash
chown root:root /root/3x-ui-delivery.env /root/3x-ui-client-links.txt
chmod 0600 /root/3x-ui-delivery.env /root/3x-ui-client-links.txt
```

只告诉用户文件路径和安全取回方式，例如通过其现有 SSH 会话执行 `scp`。除 SSH 隧道命令和本地面板访问地址外，不要把文件正文回显到聊天。二维码如需生成，也只能保存在用户控制的本地目录，不嵌入公开文章。

## 13. 端到端验证

### 13.1 服务端静态检查

```bash
systemctl is-active x-ui
systemctl is-enabled x-ui
systemctl is-active fail2ban
ss -lntup
journalctl -u x-ui -n 100 --no-pager
ufw status verbose
iptables -t nat -L PREROUTING -n -v --line-numbers
```

确认日志中没有配置解析失败、证书读取失败、端口占用或持续认证错误。

### 13.2 VLESS REALITY 实测

Agent 应在其本地执行环境自动使用与服务器版本兼容的官方 Xray-core 做临时客户端，不等待用户手工导入。通过 SSH/SCP 将所需客户端参数写入本地 `mktemp` 目录的 `0600` 配置文件，启动临时 SOCKS 端口访问公网；秘密不得出现在命令参数、聊天或持久日志中。验证：

- 客户端无 REALITY 认证错误。
- 服务端能看到新连接到实际的 `REALITY_PORT/tcp`。
- 经代理查询到的出口地址等于服务器公网地址。
- 关闭测试客户端后，本地临时端口和配置被清理。

若服务端完全没有连接，先检查客户端是否真的选中该节点、DNS、云安全组和运营商路径。若连接到达但认证失败，再核对客户端核心版本、UUID、公钥、Short ID、SNI、指纹、Flow 和 SpiderX，不要重复改防火墙。

如果 Agent 所在执行环境无法运行客户端二进制，应至少从独立网络完成 TCP 可达性与服务端配置加载验证，并把“真实流量验证待完成”作为唯一明确待办；不能要求用户重新提供已经保存在交付文件中的参数。

### 13.3 Hysteria2 与端口跳跃实测

仅在启用 Hysteria2 时执行。Agent 使用兼容的官方客户端和本地临时 `0600` 配置自动访问公网并验证出口地址，测试结束立即清理。测试前后比较 NAT 规则计数：

```bash
iptables -t nat -L PREROUTING -n -v --line-numbers
```

只有客户端成功联网且跳跃规则计数增加，才能判定端口跳跃有效。仅看到实际 `HYSTERIA2_PORT/udp` 监听或面板显示入站启用，不算通过。

### 13.4 重启后验证

相关服务重启已包含在一次性授权中。默认不重启整台服务器；只有用户在首条消息中明确授权整机重启时才执行。

```bash
systemctl restart x-ui
systemctl restart hysteria2-port-hop.service || true
systemctl is-active x-ui
systemctl is-active hysteria2-port-hop.service || true
```

重新检查监听端口、NAT 规则、防火墙、证书和至少一个客户端连接。若首条消息已授权整机重启，再额外验证 BBR 模块与所有开机服务；否则服务级重启验证即满足默认方案。

# 输出结果

全部步骤和端到端验证通过后，应产生以下可核对的交付结果：

| 交付项 | 必须包含的结果 |
| --- | --- |
| 运行中的服务 | 已记录实际版本的 3x-ui 与 Xray-core；`x-ui` 和 Fail2ban 状态符合预期并已按需设置开机启动 |
| 面板访问方式 | `tunnel` 模式下仅监听 `127.0.0.1`，私密回复提供已替换实际值的 SSH 隧道命令和完整本地访问地址；`public_https` 模式下提供证书有效、只开放指定高位 TCP 端口的 HTTPS 地址 |
| VLESS REALITY 节点 | 已创建并通过真实客户端流量验证；服务端监听、REALITY 握手和出口地址均有脱敏证据 |
| Hysteria2 节点 | 仅在启用时创建；真实客户端能够联网，基础 UDP 端口和跳跃范围可达，NAT 规则计数出现实际命中 |
| 系统安全与调优 | UFW、云安全组、Fail2ban 和可选 TCP BBR 与最终解析出的端口矩阵及开关一致，未开放无关端口 |
| 私密配置文件 | `/root/3x-ui-delivery.env` 与 `/root/3x-ui-client-links.txt` 由 root 所有且权限为 `0600`，保存凭据、节点参数和导入链接 |
| 脱敏验收报告 | 列出版本、面板模式、监听端口、服务状态、防火墙摘要、客户端实测、NAT 命中、交付文件路径和未完成事项，不包含任何秘密 |
| 回滚材料 | 保存变更前备份、规则快照、回滚命令和备份位置，能够精确撤销本次新增的入站、NAT、UFW、云安全组和 BBR 配置 |

如果任一必需验证未通过，输出结果必须改为“未完成”的阶段性报告：明确成功项、失败项、诊断证据、当前服务器状态和安全恢复建议，不得生成成功结论或把未经验证的配置作为最终交付。

# 验证方法

只有以下项目全部通过，才能向用户报告完成：

- 3x-ui 与 Xray-core 的实际版本已记录，`x-ui` 服务 active 且 enabled。
- 安装结果和交付文件由 root 拥有，权限为 `0600`。
- 面板符合所选模式：回环监听加 SSH 隧道，或证书有效的公网 HTTPS。
- UFW 与云安全组只开放端口矩阵中列出的端口。
- VLESS REALITY 通过真实客户端访问公网，出口地址正确。
- 启用 Hysteria2 时，真实客户端可联网，且 UDP 跳跃 NAT 计数增加。
- Fail2ban active，并能列出有效 jail 或明确说明当前保护范围。
- 启用内核 BBR 时，拥塞算法为 `bbr`、队列为 `fq`、模块已加载。
- 重启相关服务后，入站监听和 NAT 规则仍然存在。
- 最终报告不包含任何认证秘密，只包含版本、状态、端口、验证结果、交付文件路径和回滚位置；`tunnel` 模式还必须展示可直接复制的 SSH 隧道命令及完整的本地面板访问地址。

# 异常处理

## 面板打不开

1. 检查 `x-ui` 状态、实际监听 IP、端口和 WebBasePath。
2. `tunnel` 模式检查 SSH 隧道是否仍在运行，不开放公网端口作为临时绕过。
3. `public_https` 模式检查 DNS、云安全组、UFW、证书主机名和服务日志。
4. TCP 探测成功但 HTTP 不正常时，以真实 HTTPS 响应和服务端日志为准。

## REALITY 认证失败

1. 确认连接确实到达服务器。
2. 比较 UUID、公钥、Short ID、SNI、指纹、Flow、SpiderX 和客户端核心版本。
3. 检查目标站点从服务器是否可达，证书与 SNI 是否匹配。
4. 只有日志证明最低客户端版本不兼容时，才按当前官方文档调整 `minClientVer`，调整不得低于验收客户端所需的明确版本，并记录原因。
5. 修改后生成全新分享链接，要求删除旧节点再导入，避免残留字段。

## Hysteria2 超时

1. 确认客户端使用 UDP，云安全组和 UFW 均开放基础端口与跳跃范围。
2. 使用抓包或规则计数判断数据是否到达服务器。
3. 检查 TLS 证书、SNI、ALPN、认证值和客户端兼容性。
4. 检查 `udpHop` 是否位于当前核心要求的字段层级。
5. 检查 NAT 规则是否将范围转发到实际单一监听端口。

## DNS 解析不一致

等待 TTL 到期，并从多个解析器和服务器本机复查。基础 REALITY 节点分享地址自动暂用服务器公网 IP；依赖证书的可选步骤不得跳过域名校验。

## 防火墙启用后 SSH 中断

立即使用云厂商控制台、串口或救援模式恢复 SSH 端口规则。不要反复重启服务器。恢复连接后先导出当前规则，定位协议、端口或来源限制错误。

## 安装脚本或 API 结构变化

停止执行，记录已安装版本和错误响应，查阅该版本官方文档或从面板创建一个最小同类入站再读取结构。不要通过删除未知字段或降级安全设置强行成功。

# 回滚方式

回滚前先保存当前日志、版本、监听端口和规则快照，避免丢失诊断证据。

1. 删除本次创建的 VLESS 和 Hysteria2 入站，确认 Xray 仍能加载其他既有配置。
2. 停止并禁用 `hysteria2-port-hop.service`，执行其 `stop` 动作删除带唯一 comment 的 NAT 规则，再移走脚本和 unit 文件。
3. 使用 `ufw status numbered` 精确删除本次新增的规则；同时撤销云安全组中对应规则。不要执行会清空用户全部规则的命令。
4. 删除 `/etc/sysctl.d/99-bbr.conf` 和 `/etc/modules-load.d/bbr.conf` 后执行 `sysctl --system`。运行中的 `tcp_bbr` 模块是否卸载取决于引用状态，不强制卸载。
5. 若是本轮全新安装且自动回滚需要移除 3x-ui，先备份 `/etc/x-ui/` 和证书，再使用当前版本官方卸载入口。不要手工递归删除未核对的目录；发现安装前已有数据时不得自动卸载。
6. 恢复部署前备份的面板数据库、服务环境文件、防火墙规则和证书配置。
7. 最后验证 SSH 仍可登录、原有服务端口恢复、系统防火墙处于预期状态。

回滚完成后提交脱敏报告，列出已恢复的项目、仍保留的备份路径和需要用户手工处理的云安全组或 DNS 项目。

# 官方参考

- [3x-ui 官方安装说明](https://github.com/MHSanaei/3x-ui/wiki/Installation)
- [3x-ui 官方仓库](https://github.com/MHSanaei/3x-ui)
- [3x-ui REALITY 配置说明](https://github.com/MHSanaei/3x-ui/blob/main/docs/content/docs/en/config/reality.mdx)
- [3x-ui 入站 API 参考](https://github.com/MHSanaei/3x-ui/blob/main/docs/content/docs/en/reference/api/inbounds.mdx)
- [Xray-core 官方发行说明](https://github.com/XTLS/Xray-core/releases)
