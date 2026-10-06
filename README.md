# Cloudflare Pages 部署（网页后台操作，无需命令行）

只上传 upload 文件夹里的 3 个文件：index.html、_worker.js、_routes.json

1. 建数据库：Workers & Pages -> D1 -> 创建数据库(如 qw-db) -> 进入 Console，
   把 schema.sql 里的内容粘贴进去执行。
2. 在你的 Pages 项目里 -> Create new deployment(新建部署) -> 上传 upload 文件夹。
3. Pages 项目 -> Settings(设置) -> Bindings(绑定) -> Add -> D1 database：
   变量名填 DB，选择刚建的数据库（Production 和 Preview 都加）。
4. Settings -> Variables and secrets：添加两个 Secret
   JWT_SECRET = 一长串随机字符；ADMIN_KEY = 你自定义的管理员注册密钥。
5. 再上传一次 upload 文件夹（绑定和变量对新部署才生效）。
6. 浏览器打开 https://你的域名/api/health ，看到 {"worker":true,"db":true,"jwt":true,...,"schema":"ok"} 即成功。
