---
title: Linux下安装Nginx完整教程
date: 2026-03-16 13:39:35
lastmod: 2026-03-15 21:22:18 +0800
tags: [Linux, Nginx]
draft: false
summary: 在Linux下安装Nginx教程，这里以CentOS举例，同时安装过程中所会出现的一些问题，也会附带有解释和解决办法
images: https://th.bing.com/th/id/OIP.oyOF3Mvy-oGDOV6oOilj1wHaDt?pid=ImgDet&rs=1?
authors: ['default']
layout: PostLayout
---

# 前言

在 Linux 下安装 Nginx 教程，这里以 CentOS 举例，同时安装过程中所会出现的一些问题，也会附带有解释和解决办法

# 一、更新系统并安装 Nginx

```bash
#更新系统
sudo yum update -y

# 安装 EPEL 仓库（CentOS 7）
sudo yum install epel-release -y
# 或者 CentOS 8/RHEL 8 使用 dnf
# sudo dnf install epel-release -y

# 安装 Nginx
sudo yum install nginx -y

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查 Nginx 状态
sudo systemctl status nginx
```

执行完安装 epel 仓库命令如果服务器输出以下内容属于正常情况

```bash
Loaded plugins: fastestmirror, langpacks
→ yum 正在加载插件，这是正常的启动信息
Repository epel is listed more than once in the configuration
→ 这是一条警告，意思是 EPEL 仓库在配置文件中被重复列出了
→ 不影响使用，但可以忽略或清理
Loading mirror speeds from cached hostfile
Package epel-release-7-14.noarch already installed and latest version
→ EPEL 仓库包已经安装了，并且是最新版本
Nothing to do
→ 没有需要做的事情（因为已经安装好了）
```

# 二、配置防火墙

CentOS 默认使用 firewalld，需要开放 HTTP 和 HTTPS 端口：

```bash
# 检查防火墙状态
sudo systemctl status firewalld

# 如果防火墙未运行，启动它
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 开放 HTTP (80) 和 HTTPS (443) 端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 重载防火墙规则
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-all
```

如果是云服务的 CentOS，那么应该是默认禁用了 firewall 的，使用**sudo systemctl status firewalld**命令输出结果应该是**Disabled**，因为云服务器一般是默认给你放开了**80**和**443**端口

# 三、创建网站目录

```bash
# 创建网站根目录
sudo mkdir -p /var/www/blog

# 设置目录所有者为你的用户（假设是 root，如果是其他用户请替换）
sudo chown -R root:root /var/www/blog

# 设置正确的权限
sudo chmod -R 755 /var/www/blog

# （可选）为了方便，可以给当前用户写权限
# sudo chown -R $USER:$USER /var/www/blog
```

# 四、创建 Nginx 配置文件

```bash
# 创建配置文件
sudo vi /etc/nginx/conf.d/blog.conf
```

复制以下内容到配置文件中：

```bash
server {
    listen 80;
    server_name your-domain.com;  # 替换成你的域名，如果没有域名就用服务器 IP

    root /var/www/blog;
    index index.html;

    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss
   application/json;

    # 处理 Next.js 静态导出的路由
    location / {
        try_files $uri $uri.html $uri/ /index.html =404;
    }

    # Next.js 静态资源（_next 目录）
    location /_next/ {
           try_files $uri $uri/ =404;
    }

    # 图片、CSS、JS 等静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|svg|css|js|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 拒绝访问隐藏文件
    location ~ /\. {
        deny all;
    }

    # 自定义错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

保存并退出：

- 使用 vi：按 Esc，输入 :wq，按 Enter
- 使用 nano：按 Ctrl+O 保存，按 Enter 确认，按 Ctrl+X 退出

# 五、检查并删除默认配置（可选）

```bash
# 查看主配置文件
sudo cat /etc/nginx/nginx.conf

# 如果需要禁用默认配置，可以注释掉或删除
sudo vi /etc/nginx/nginx.conf
```

在主配置文件中找到**include /etc/nginx/conf.d/\*.conf;**这一行，确保它没有被注释掉。

# 六、测试 Nginx 配置

```bash
# 测试配置文件语法
sudo nginx -t
```

如果看到 **syntax is ok** 和 **test is successful**，说明配置正确。

# 七、重载 Nginx 配置

```bash
# 重载配置（不中断服务）
sudo systemctl reload nginx

# 或者重启 Nginx
sudo systemctl restart nginx

# 确认 Nginx 运行正常
sudo systemctl status nginx
```

# 八、设置 SELinux（重要！）

CentOS 默认启用（云服务器一般是默认禁用，如果是云服务器可以直接跳过这一步） SELinux，可能会阻止 Nginx 访问文件。需要配置 SELinux：

```bash
# 检查 SELinux 状态
sudo getenforce

# 如果是 Enforcing，需要设置 SELinux 上下文
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/blog(/.*)?"
sudo restorecon -Rv /var/www/blog

# 允许 Nginx 网络访问（如果需要）
sudo setsebool -P httpd_can_network_connect 1
# 如果 semanage 命令不存在，先安装：
udo yum install policycoreutils-python -y  # CentOS 7
# 或
sudo dnf install policycoreutils-python-utils -y  # CentOS 8
```

如果是云服务器，执行命令：**sudo getenforce**，返回结果是**Disabled**,说明已经是禁用了的

自此，Nginx 到这里就安装完成了，如果通过 IP 访问服务器返回结果是**403**，那么应该是 **/var/www/blog**目录下没有 index 文件，可以生成一个测试文件：

```bash
sudo bash -c 'cat > /var/www/blog/index.html << EOF
  <!DOCTYPE html>
  <html>
  <head>
      <title>测试页面</title>
      <meta charset="utf-8">
  </head>
  <body>
      <h1>🎉 Nginx 配置成功！</h1>
      <p>你的服务器已经可以正常访问了。</p>
      <p>接下来等 GitHub Actions 部署完成后，这里就会显示你的博客内容。</p>
  </body>
  </html>
  EOF'
```
