#!/bin/bash
# 一键配置 HTTPS（Let's Encrypt + Nginx）
# 用法：在服务器上以 root 身份执行此脚本
# curl -sSL https://... 或直接复制到服务器运行
#
# 前置条件：域名 calvinhiram.top 的 DNS A 记录已指向本服务器 IP

set -e

DOMAIN="calvinhiram.top"
WWW_DOMAIN="www.calvinhiram.top"
EMAIL="calvin.hiram@icloud.com"

# 自动检测 Nginx 配置路径
if [ -d /etc/nginx/conf.d ]; then
  NGINX_CONF="/etc/nginx/conf.d/blog.conf"
  NGINX_DIR_TYPE="conf.d"
elif [ -d /etc/nginx/sites-available ]; then
  NGINX_CONF="/etc/nginx/sites-available/blog"
  NGINX_DIR_TYPE="sites"
else
  echo -e "${RED}找不到 Nginx 配置目录（/etc/nginx/conf.d 或 /etc/nginx/sites-available）${NC}"
  exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}===== 开始配置 HTTPS =====${NC}"

# 1. 检测系统
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo -e "${RED}无法检测系统版本${NC}"
  exit 1
fi

echo -e "${YELLOW}检测到系统: $OS${NC}"

# 2. 安装 certbot
echo -e "${YELLOW}安装 certbot...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  apt update -qq
  apt install -y -qq certbot
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "tencentos" ]; then
  yum install -y epel-release 2>/dev/null || true
  yum install -y certbot
else
  # 尝试 snap 安装（通用方式）
  snap install core 2>/dev/null || true
  snap refresh core 2>/dev/null || true
  snap install --classic certbot 2>/dev/null || true
  ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
fi

# 3. 申请证书（standalone 模式，需要 80 端口空闲）
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ -f "$CERT_PATH" ]; then
  echo -e "${GREEN}证书已存在，跳过申请${NC}"
else
  echo -e "${YELLOW}申请 SSL 证书...${NC}"
  systemctl stop nginx 2>/dev/null || true
  certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN"

  if [ ! -f "$CERT_PATH" ]; then
    echo -e "${RED}证书申请失败，请检查 DNS 是否已指向本服务器${NC}"
    exit 1
  fi
  echo -e "${GREEN}证书申请成功${NC}"
fi

# 5. 备份旧 Nginx 配置（如果存在）
if [ -f "$NGINX_CONF" ]; then
  cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"
  echo -e "${YELLOW}已备份旧配置${NC}"
fi

# 6. 写入新 Nginx 配置
echo -e "${YELLOW}写入 Nginx 配置: $NGINX_CONF${NC}"
cat > "$NGINX_CONF" << NGINX_EOF
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    return 301 https://\$host\$request_uri;
}

# HTTPS 主站
server {
    listen 443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;

    ssl_certificate     $CERT_PATH;
    ssl_certificate_key $KEY_PATH;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    root /var/www/blog;
    index index.html;

    location / {
        try_files \$uri \$uri.html \$uri/ =404;
    }

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINX_EOF

# 7. 清除旧配置避免冲突
if [ "$NGINX_DIR_TYPE" = "sites" ]; then
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/blog 2>/dev/null || true
  rm -f /etc/nginx/sites-enabled/default
elif [ "$NGINX_DIR_TYPE" = "conf.d" ]; then
  # 确保 nginx.conf 中包含 conf.d
  if ! grep -q 'include.*conf\.d' /etc/nginx/nginx.conf 2>/dev/null; then
    echo 'include /etc/nginx/conf.d/*.conf;' >> /etc/nginx/nginx.conf
  fi
fi

# 8. 启动并测试 Nginx
echo -e "${YELLOW}测试 Nginx 配置...${NC}"
nginx -t && systemctl reload nginx
echo -e "${GREEN}Nginx 配置更新完成${NC}"

# 9. 配置自动续期
echo -e "${YELLOW}配置证书自动续期...${NC}"
RENEW_SCRIPT="/usr/local/bin/certbot-renew.sh"
cat > "$RENEW_SCRIPT" << 'RENEW_EOF'
#!/bin/bash
certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"
RENEW_EOF
chmod +x "$RENEW_SCRIPT"

# 每天凌晨 3 点检查续期
(crontab -l 2>/dev/null | grep -v certbot-renew; echo "0 3 * * * $RENEW_SCRIPT") | crontab -

echo -e "${GREEN}===== HTTPS 配置完成！=====${NC}"
echo -e "访问地址: ${GREEN}https://$DOMAIN${NC}"
echo -e "证书路径: $CERT_PATH"
echo -e "Nginx 配置: $NGINX_CONF"
echo -e "自动续期: 每天凌晨 3:00 检查"
