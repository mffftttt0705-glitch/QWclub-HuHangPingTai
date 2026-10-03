# 下一阶段必须完成的安全迁移项

1. PHP API -> Workers / Pages Functions
2. MySQL -> D1（先做 schema/SQL 兼容性审计）
3. uploads -> R2，禁止脚本执行
4. 删除后台在线命令执行/插件动态安装能力
5. 所有 secret 移出源码，使用 Cloudflare Secrets
6. 登录限速、验证码/风控、Session/JWT 安全处理
7. 支付回调验签、金额校验、幂等、防重放
8. 所有文件上传做 MIME + magic bytes + size + extension 校验
9. CORS 使用明确来源白名单
10. 关闭 debug/trace，生产日志脱敏
11. 对所有外部 URL 做 allowlist，避免 SSRF
12. 完成 API 鉴权和越权测试
