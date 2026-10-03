# Monster Cloudflare Pages static package

这是可直接作为 Cloudflare Pages 发布目录的静态前端包。

## GitHub 部署

把本目录内的所有文件放在 GitHub 仓库根目录，然后在 Cloudflare Pages：

- Framework preset: None
- Build command: 留空
- Build output directory: `/`（或 `.`）

如果 Cloudflare 界面要求填写构建命令，可使用：`exit 0`，发布目录设为 `.`。

注意：这是前端静态包。原 PHP 后端、登录、订单、支付等动态 API 尚未迁移到 Workers/D1。
