---
title: '我用 DeepSeek 做了一个每日新闻推送助手'
date: 2026-07-14 01:26:16
lastmod: 2026-07-14 01:26:16
tags: 
    - Tutorial
    - DeepSeek
    - Project
    - AI
draft: false
summary: ''
images: [https://calvinhiram.top/images/cover.svg]
authors: ['default']
layout: PostLayout
---

# 我用 DeepSeek 做了一个每日新闻推送助手

> 每天早上 8 点，自动抓取全球新闻，用 DeepSeek AI 生成中文摘要，推送到你的邮箱和手机。

## 项目概述

一个运行在云服务器上的 Python 项目，每天自动执行：

1. 从多个 RSS 源抓取新闻，覆盖时事、军事、财经、科技四个分类
2. 调用 DeepSeek API 批量生成中文摘要（带背景分析和事件意义）
3. 通过 QQ 邮箱 SMTP 发送 HTML 排版邮件到 iCloud
4. 通过 Bark App 推送即时通知到 iPhone
5. SQLite 去重，同一条新闻绝不重复推送

**每月成本：约 0.3 元**（DeepSeek API 费用，每天约 1 分钱）。

---

## 技术栈

| 组件   | 选型                       |
| ------ | -------------------------- |
| 语言   | Python 3.8+                |
| AI     | DeepSeek (`deepseek-chat`) |
| 新闻源 | RSS 多源 + NewsAPI（可选） |
| 邮件   | QQ 邮箱 SMTP               |
| 推送   | Bark（iOS 免费 App）       |
| 存储   | SQLite                     |
| 调度   | Linux cron                 |
| 部署   | 阿里云 CentOS 7            |

---

## 第一步：准备工作

### 你需要准备

- 一台 Linux 云服务器（本文以阿里云 CentOS 7 为例）
- DeepSeek API 密钥（[platform.deepseek.com](https://platform.deepseek.com) 申请）
- 一个 QQ 邮箱（开启 SMTP 服务获取授权码）
- iPhone 安装 [Bark](https://apps.apple.com/app/bark/id1403753865) 并获取 token

### Bark 安装

1. App Store 搜索「Bark」下载
2. 打开 App，点击「注册设备」，复制显示的 token
3. 测试推送：浏览器访问 `https://api.day.app/你的token/测试标题/测试内容`

### QQ 邮箱 SMTP 授权码

1. 登录 QQ 邮箱网页版 → 设置 → 账户
2. 下拉到「POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务」
3. 开启「SMTP 服务」→ 按提示发短信验证 → 获得 16 位授权码
4. 记下这个授权码，后面配置要用

---

## 第二步：项目结构

```
daily-news-brief/
├── .env                  # 敏感配置（API 密钥等，不提交 git）
├── .env.example          # 配置模板（可提交）
├── .gitignore
├── config.py             # 配置读取
├── main.py               # 主入口
├── requirements.txt      # Python 依赖
├── data/                 # 运行时生成（SQLite + 日志）
└── modules/
    ├── __init__.py
    ├── news_fetcher.py   # 新闻源抓取
    ├── ai_summarizer.py  # DeepSeek AI 总结
    ├── storage.py        # SQLite 去重存储
    ├── email_sender.py   # 邮件推送
    ├── bark_sender.py    # Bark 推送
    └── logger.py         # 日志系统
```

---

## 第三步：核心代码解析

### 3.1 配置管理（config.py）

使用 `.env` 文件管理敏感信息，`python-dotenv` 自动加载：

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.qq.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    TO_EMAIL = os.getenv("TO_EMAIL", "")
    BARK_TOKEN = os.getenv("BARK_TOKEN", "")
```

### 3.2 新闻源抓取（news_fetcher.py）

核心思路：多 RSS 源并行抓取 → URL 去重 → 按分类截取上限。

```python
RSS_SOURCES = [
    # 时事
    {"url": "http://www.people.com.cn/rss/politics.xml", "category": "时事", "source": "人民日报-时政"},
    {"url": "https://www.chinanews.com.cn/rss/scroll-news.xml", "category": "时事", "source": "中新网"},
    # 军事
    {"url": "http://www.people.com.cn/rss/military.xml", "category": "军事", "source": "人民日报-军事"},
    # 财经
    {"url": "https://rss.huxiu.com/", "category": "财经", "source": "虎嗅网"},
    # 科技
    {"url": "https://36kr.com/feed", "category": "科技", "source": "36氪"},
    {"url": "https://www.solidot.org/index.rss", "category": "科技", "source": "Solidot"},
    {"url": "https://www.ithome.com/rss/", "category": "科技", "source": "IT之家"},
    # ... 更多源
]

CATEGORY_LIMIT = 15  # 每个分类最多保留 15 条
```

**关键设计**：用 `requests.get()` 先拉取再交给 `feedparser` 解析，而不是让 `feedparser` 直接请求。这样可以设置超时，避免被墙的源卡死整个流程。

```python
def fetch_rss(rss_config):
    xml_content = _fetch_url(rss_config["url"])  # requests + 15s 超时
    if xml_content is None:
        return []  # 超时直接跳过，不阻塞
    feed = feedparser.parse(xml_content)
    # ...
```

### 3.3 AI 总结（ai_summarizer.py）

这是整个项目的核心——把 60 条新闻一次性丢给 DeepSeek，返回带背景分析的中文摘要。

```python
from openai import OpenAI

client = OpenAI(
    api_key=Config.DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",  # DeepSeek 兼容 OpenAI SDK
)

def summarize(news_items):
    # 组装一条消息包含所有新闻
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,   # 新闻总结要准确，不用创意
        max_tokens=8192,   # 60 条输出需要足够的 token
    )
    return parse_json(response.choices[0].message.content)
```

**Prompt 设计的教训**：最初让 AI 「精简改写标题」，结果摘要和原标题没区别。后来改成「补充关键背景和事件意义」，摘要才有了真正的信息增量。

```
旧: "苹果起诉OpenAI，指控前员工窃取商业机密。" ← 复读标题
新: "苹果指控OpenAI通过挖角前华裔员工窃取其AI芯片相关商业机密，
    此举可能升级为两家公司在AI人才和知识产权领域的全面战争。" ← 有分析
```

**JSON 解析容错**：DeepSeek 返回的 JSON 可能包在 markdown 代码块里，需要三层解析：

```python
def _parse_json(raw):
    # 1. 直接解析
    try: return json.loads(raw)
    except: pass
    # 2. 提取 ```json ... ``` 代码块
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
    # 3. 正则匹配 [...] 数组
    match = re.search(r'\[[\s\S]*\]', raw)
```

### 3.4 邮件 HTML 排版（email_sender.py）

按分类分组展示，顶部有分类导航标签，点击跳转到对应区块。

**锚点导航**的关键：邮件客户端会 strip 空的 `<a name="..."></a>` 标签，必须把 name 属性放在有内容的元素上：

```html
<!-- ❌ 会被邮件客户端吞掉 -->
<a name="cat-科技"></a>
<h2>科技</h2>

<!-- ✅ 正确做法：包裹在有内容的元素内 -->
<h2><a name="cat-科技" style="text-decoration:none;color:#2980b9;">科技</a></h2>
```

### 3.5 SQLite 去重（storage.py）

用 URL 的 MD5 哈希值做唯一索引，`INSERT OR IGNORE` 保证同一 URL 不会入库两次。

```sql
CREATE TABLE sent_articles (
    url_hash TEXT UNIQUE NOT NULL,  -- URL 的 MD5
    url TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    category TEXT,
    source TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.6 日志系统（logger.py）

每次运行生成一条带时间戳的分隔线，按模块标注来源：

```
2026-07-14 08:00:01 [main            ] INFO    ==================================================
2026-07-14 08:00:01 [main            ] INFO      每日新闻速览  2026-07-14 08:00:01
2026-07-14 08:00:01 [main            ] INFO    ==================================================
2026-07-14 08:00:01 [modules.news_fetcher] INFO    开始抓取新闻...
2026-07-14 08:00:05 [modules.ai_summarizer] INFO    发送 60 条新闻到 DeepSeek...
2026-07-14 08:00:25 [modules.ai_summarizer] INFO    成功解析 48 条摘要
2026-07-14 08:00:25 [modules.email_sender] INFO    发送成功
2026-07-14 08:00:26 [modules.bark_sender] INFO    推送成功
```

---

## 第四步：部署到服务器

### 4.1 服务器环境

项目需要 Python 3.8+。CentOS 7 默认 Python 3.6 太旧，且已停止维护，yum 源都已失效。

**解决方案**：用 Miniconda 安装独立的 Python 环境，不依赖系统 yum。

```bash
wget https://repo.anaconda.com/miniconda/Miniconda3-py38_4.12.0-Linux-x86_64.sh
bash Miniconda3-py38_4.12.0-Linux-x86_64.sh -b -p /opt/miniconda3
/opt/miniconda3/bin/conda init bash
source ~/.bashrc
```

### 4.2 通过 Git 部署

在阿里云上创建 bare repo，本地 push 过去：

```bash
# 服务器
mkdir -p /opt/daily-news-brief.git
cd /opt/daily-news-brief.git
git init --bare

# 本地
git remote add aliyun root@8.137.98.254:/opt/daily-news-brief.git
git push aliyun master

# 服务器 clone 出工作目录
cd /opt
git clone daily-news-brief.git daily-news-brief
```

> 这个知识很多人不知道：git 是分布式协议，不依赖 GitHub。只要服务器上有 bare repo，就能像推 GitHub 一样 `git push` 到自己的服务器。

### 4.3 配置 .env

```bash
cd /opt/daily-news-brief
vim .env
```

填入：

```
DEEPSEEK_API_KEY=sk-xxxxxxxx
NEWSAPI_KEY=xxxxxxxx
NEWSAPI_ENABLED=false        # 阿里云无法直连，关闭
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=你的QQ邮箱授权码
TO_EMAIL=你的iCloud邮箱@icloud.com
BARK_TOKEN=你的Bark token
```

### 4.4 安装依赖并测试

```bash
pip install -r requirements.txt
python3 main.py --fetch-only  # 先测试抓取
python3 main.py               # 完整流程
```

### 4.5 配置定时任务

```bash
crontab -e
```

添加：

```
0 8 * * * /opt/miniconda3/bin/python3 /opt/daily-news-brief/main.py >> /opt/daily-news-brief/data/cron.log 2>&1
```

每天早 8 点自动执行。

---

## 第五步：日常使用

### 更新代码

```bash
git push aliyun master                          # 本地推送
ssh root@8.137.98.254 'cd /opt/daily-news-brief && git pull'  # 服务器拉取
```

### 查看日志

```bash
ssh root@8.137.98.254
tail -100 /opt/daily-news-brief/data/news.log
```

### 调整配置

| 调整项       | 位置                                                |
| ------------ | --------------------------------------------------- |
| 每类新闻数量 | `modules/news_fetcher.py` 第 18 行 `CATEGORY_LIMIT` |
| 推送时间     | `crontab -e`                                        |
| 增减新闻源   | `modules/news_fetcher.py` 的 `RSS_SOURCES` 列表     |
| 代理翻墙     | `.env` 里 `HTTPS_PROXY=http://127.0.0.1:7890`       |
| 关闭 NewsAPI | `.env` 里 `NEWSAPI_ENABLED=false`                   |

### 成本

DeepSeek `deepseek-chat` 定价约 ¥1/百万 input tokens、¥2/百万 output tokens。

60 条新闻 ≈ 6,000 input + 3,000 output tokens = 约 ¥0.012/天 ≈ ¥0.36/月。

---

## 总结

这个项目麻雀虽小五脏俱全，涉及了：

- 多源数据聚合与容错
- LLM API 调用与 Prompt Engineering
- HTML 邮件排版与邮件客户端兼容性
- SQLite 去重设计
- Linux 服务器部署（git bare repo + cron）
- 旧系统兼容性处理（CentOS 7 + Python 3.6 → Miniconda Python 3.8）

全文代码可在 [GitHub](https://github.com/Christine0801/daily-news-brief) 查看。

---

