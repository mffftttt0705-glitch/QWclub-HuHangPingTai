# 怪兽 - Cloudflare Pages 前端安全迁移包

这是从原项目中提取的 H5 编译产物，可直接作为 Cloudflare Pages 的静态前端部署包。

## 部署

### Wrangler

```bash
npx wrangler login
npx wrangler pages deploy dist --project-name monster-pages
```

### Cloudflare Pages Git

- Build command: 留空
- Build output directory: `dist`

## 重要说明

这个包只包含原项目的 H5 静态前端，**不是完整的 PHP 后端迁移版**。原项目依赖 PHP/ThinkPHP、MySQL、登录、订单、支付、上传等后端能力；直接把 PHP 删除后部署 Pages 会导致动态功能失效。

下一阶段应把原 PHP API 迁移到 Cloudflare Workers/Pages Functions，并把数据库迁移到 D1、文件迁移到 R2。

## 安全处理

原压缩包中的 `.env`、支付证书、私钥、数据库凭据没有复制进本包。

部署正式环境前必须轮换原项目中已经出现过的数据库密码、支付密钥、第三方 API Key/Secret。

`_headers` 仅加入不依赖应用逻辑的基础安全响应头；CSP 没有在未验证资源依赖前强行开启，以免破坏现有 H5。
