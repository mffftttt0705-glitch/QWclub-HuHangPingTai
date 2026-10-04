#!/bin/bash

# ============================================
# QW电竞护航平台 - D1数据库初始化脚本
# 用于在Cloudflare Workers中初始化D1数据库
# ============================================

set -e

echo "============================================"
echo "QW电竞护航平台 - D1数据库初始化"
echo "============================================"
echo ""

# 检查是否安装了wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误：未找到wrangler CLI"
    echo "请安装wrangler: npm install -g wrangler"
    exit 1
fi

# 检查是否登录Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  警告：未登录Cloudflare"
    echo "请先运行: wrangler login"
    echo ""
    read -p "是否现在登录？(y/n): " login_choice
    if [[ "$login_choice" == "y" || "$login_choice" == "Y" ]]; then
        wrangler login
    else
        exit 1
    fi
fi

# 获取项目名称
PROJECT_NAME="qw-esports-platform"
DB_NAME="qw-esports-db"

echo "📦 项目: $PROJECT_NAME"
echo "🗄️  数据库: $DB_NAME"
echo ""

# 确认操作
read -p "是否继续？(y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "🔄 步骤1: 创建数据库..."
echo "--------------------------------------------"

# 创建数据库（如果不存在）
if ! wrangler d1 list 2>/dev/null | grep -q "$DB_NAME"; then
    echo "创建数据库: $DB_NAME"
    wrangler d1 create "$DB_NAME" --binding DB
    echo "✅ 数据库创建成功"
else
    echo "数据库已存在: $DB_NAME"
fi

echo ""
echo "🔄 步骤2: 检查schema文件..."
echo "--------------------------------------------"

if [[ ! -f "schema.sql" ]]; then
    echo "❌ 错误：未找到schema.sql文件"
    exit 1
fi

echo "✅ schema.sql文件存在"

echo ""
echo "🔄 步骤3: 应用数据库schema..."
echo "--------------------------------------------"

# 本地测试
echo "🧪 本地测试..."
if wrangler d1 execute "$DB_NAME" --local --command="cat schema.sql" 2>&1 | tee /tmp/d1_local_output.txt; then
    echo "✅ 本地测试成功"
else
    echo "❌ 本地测试失败"
    cat /tmp/d1_local_output.txt
    exit 1
fi

echo ""
echo "🔄 步骤4: 远程应用schema..."
echo "--------------------------------------------"

# 远程应用
echo "🚀 远程应用..."
if wrangler d1 execute "$DB_NAME" --remote --command="cat schema.sql" 2>&1 | tee /tmp/d1_remote_output.txt; then
    echo "✅ 远程应用成功"
else
    echo "❌ 远程应用失败"
    cat /tmp/d1_remote_output.txt
    exit 1
fi

echo ""
echo "🔄 步骤5: 验证数据库..."
echo "--------------------------------------------"

# 验证表是否创建
echo "📋 验证表创建情况..."
wrangler d1 execute "$DB_NAME" --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "🔄 步骤6: 获取数据库ID..."
echo "--------------------------------------------"

DB_INFO=$(wrangler d1 list 2>/dev/null | grep "$DB_NAME" || true)
if [[ -n "$DB_INFO" ]]; then
    DB_ID=$(echo "$DB_INFO" | awk '{print $2}')
    echo "🆔 数据库ID: $DB_ID"
    
    # 生成环境变量文件
    echo ""
    echo "📝 生成环境变量配置..."
    cat > .env.cloudflare << EOF
# Cloudflare D1 数据库配置
DATABASE_ID=$DB_ID
DATABASE_NAME=$DB_NAME

# API端点（部署后修改）
API_URL=https://your-worker-name.workers.dev
EOF
    
    echo "✅ 环境变量已保存到 .env.cloudflare"
else
    echo "⚠️  无法获取数据库ID，请手动从Cloudflare Dashboard获取"
fi

echo ""
echo "============================================"
echo "✅ 初始化完成！"
echo "============================================"
echo ""
echo "📋 下一步操作："
echo "1. 部署Worker API"
echo "2. 配置.env.cloudflare中的环境变量"
echo "3. 测试数据库连接"
echo ""
echo "🔗 数据库管理：https://dash.cloudflare.com/ → Workers & Pages → D1"
echo ""
echo "📖 文档：https://developers.cloudflare.com/d1/"