# 1. 安装依赖
npm install

# 2. 初始化D1数据库
bash d1/init-d1.sh

# 3. 配置wrangler.toml中的database_id
# 4. 部署到Cloudflare Pages
wrangler pages deploy .

# 5. 部署Worker API
cd worker && wrangler deploy