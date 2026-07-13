---
title: 'AI 新闻简报项目踩坑实录：从 Windows 到 CentOS 7 的 15 个坑'
date: 2026-07-14 01:27:14
lastmod: 2026-07-14 01:27:14
tags: 
    - Tutorial
    - Bug
draft: false
summary: ''
images: [https://calvinhiram.top/images/cover-qa.svg]
authors: ['default']
layout: PostLayout
---

# AI 新闻简报项目踩坑实录：从 Windows 到 CentOS 7 的 15 个坑

> 记录项目开发过程中遇到的所有问题和解决思路，按时间线排列。

---

## 目录

1. [NewsAPI 在国内被墙怎么办？](#1-newsapi-被墙)
2. [RSS 源超时卡死整个流程](#2-rss-超时卡死)
3. [Windows 上 lxml 编译失败](#3-lxml-编译失败)
4. [DeepSeek API 密钥从哪里来？](#4-deepseek-api-密钥)
5. [DeepSeek 返回的 JSON 解析失败](#5-json-解析失败)
6. [输出被 max_tokens 截断](#6-输出截断)
7. [AI 摘要质量太差，像复读标题](#7-摘要质量差)
8. [邮件分类导航点击没反应](#8-邮件锚点失效)
9. [CentOS 7 yum 源全部失效](#9-yum-源失效)
10. [Miniconda 安装提示 GLIBC 版本过低](#10-glibc-版本过低)
11. [Python 3.6 不支持 list[dict] 类型注解](#11-python-类型注解)
12. [首次运行因 data 目录不存在报错](#12-data-目录不存在)
13. [git push 到自己的服务器是怎么实现的？](#13-git-push-服务器)
14. [数据库 rowcount 取错对象导致崩溃](#14-rowcount-错误)
15. [QQ 邮箱发 iCloud 收不到邮件](#15-icould-收不到)

---

## 1. NewsAPI 被墙

**现象**：`requests.get("https://newsapi.org/...")` 超时，`Connection to newsapi.org timed out`。

**原因**：newsapi.org 在中国大陆无法直接访问。

**解决方案**：

1. **代理**：在服务器上配置代理，`.env` 中设置 `HTTPS_PROXY=http://127.0.0.1:7890`，代码中 `requests.get(url, proxies={"https": proxy})` 自动走代理
2. **关闭 NewsAPI**：在 `.env` 中设置 `NEWSAPI_ENABLED=false`，纯靠 RSS 源（推荐）
3. **选择国内可直连的 RSS 源**：人民日报、中新网、36氪、IT之家、Solidot 等

**最终选择**：方案 2 + 3。NewsAPI 在服务器上直接关闭，RSS 源全部选国内可直连的。

---

## 2. RSS 超时卡死

**现象**：`feedparser.parse(url)` 遇到被墙的源会一直挂起，不报错也不返回。

**原因**：`feedparser.parse()` 没有内置超时参数，底层直接建立连接。

**解决方案**：改架构——不要 `feedparser` 直连，先用 `requests.get(url, timeout=15)` 拉取内容，再把响应文本交给 `feedparser.parse(text)` 解析。每个源超时 15 秒就跳过，不影响其他源。

```python
def _fetch_url(url):
    resp = requests.get(url, timeout=15)  # 15 秒超时
    return resp.text

def fetch_rss(rss_config):
    xml_content = _fetch_url(rss_config["url"])
    if xml_content is None:
        return []   # 超时跳过，不阻塞
    feed = feedparser.parse(xml_content)
    # ...
```

---

## 3. lxml 编译失败

**现象**：`pip install lxml` 在 Windows 上报错 `Failed to build installable wheels`。

**原因**：lxml 需要 C 编译器，Windows 上没有。

**解决方案**：BeautifulSoup 不依赖 lxml，换成 Python 内置的 `html.parser`。

```python
# 改前
BeautifulSoup(raw, "lxml")

# 改后
BeautifulSoup(raw, "html.parser")
```

并从 `requirements.txt` 中去掉 `lxml`。

---

## 4. DeepSeek API 密钥

**现象**：第一次运行报 `401 Authentication Fails, Your api key is invalid`。

**原因**：Claude Code 在初始化 `.env` 时填入的是占位密钥，不是真实密钥。

**解决方案**：去 [platform.deepseek.com](https://platform.deepseek.com) → API Keys → 创建新密钥，填到 `.env` 的 `DEEPSEEK_API_KEY` 字段。

**教训**：API 密钥这类信息需要用户自己提供，AI 工具不应替用户编造。

---

## 5. JSON 解析失败

**现象**：DeepSeek 返回 200 OK，内容看起来是合法的 JSON，但 `json.loads()` 全部失败。

**原因**：DeepSeek 有时会在 JSON 外包 markdown 代码块标记 ````json ... ````。

**解决方案**：三层 JSON 解析容错。

```python
def _parse_json(raw):
    # 第 1 层：直接解析
    try: return json.loads(raw)
    except JSONDecodeError: pass

    # 第 2 层：提取 ```json ... ``` 代码块
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
    if match:
        try: return json.loads(match.group(1))
        except JSONDecodeError: pass

    # 第 3 层：正则匹配 [...] 数组
    match = re.search(r'\[[\s\S]*\]', raw)
    if match:
        try: return json.loads(match.group(0))
        except JSONDecodeError: pass

    # 全部失败
    return []
```

---

## 6. 输出截断

**现象**：60 条新闻输入，只解析出 0 条。检查原始响应发现最后一条 JSON 的 URL 字段被截断了一半。

**原因**：`max_tokens=4096` 不够。60 条新闻的摘要输出约需 6000+ tokens，超过限制被截断，JSON 不完整自然解析失败。

**解决方案**：

1. `max_tokens` 从 4096 调到 8192
2. 每类新闻从 20 条降到 15 条（60 条总量更合理）

---

## 7. 摘要质量差

**现象**：AI 摘要「国务院批复十五五体育强国建设规划，推动体育事业发展。」跟原标题一模一样，没有信息增量。

**原因**：Prompt 写的是「用一句话中文概括核心内容」，DeepSeek 理解为「改写标题」。

**解决方案**：重写 Prompt，明确要求补充背景和事件意义。

```
旧 Prompt：用一句话中文概括核心内容（20-50字）

新 Prompt：结合你的知识补充关键背景和「为什么这件事重要」，
          不要只是改写标题——摘要应解释「为什么」「影响多大」
```

改后效果：

```
旧: "五洲医疗拟收购芯片企业，引发市场对其成为妖股的猜测。"
新: "捷豹路虎以18万元低价清仓极光L，终止与奇瑞的国产合作，
    反映其在中国市场销量低迷和电动化转型失败，对合资车企模式敲响警钟。"
```

但第一次改得太激进——要求 30-60 字深度摘要，结果 DeepSeek 只输出了 10 条（其余全被当作「不够重要」跳过了）。

**二次调整**：缩短到 25-45 字，删除「跳过政府公文」指令，改为「尽量覆盖所有输入」。最终 60/60 全部解析成功。

---

## 8. 邮件锚点失效

**现象**：邮件顶部点「科技」标签，页面不跳转。

**排查过程**：

- 第 1 次：用 `<h2 id="cat-科技">` → 不生效（邮件客户端 strip `id` 属性）
- 第 2 次：换成空 `<a name="cat-科技"></a>` → 还是不生效（邮件客户端 strip 空锚点标签）

**最终方案**：把 `name` 属性放在有文本内容的元素上。

```html
<!-- ❌ 空锚点被吞掉 -->
<a name="cat-科技"></a>
<h2>科技</h2>

<!-- ✅ 内容包裹 -->
<h2><a name="cat-科技" style="text-decoration:none;color:#2980b9;">科技</a></h2>
```

**知识点**：邮件 HTML 的兼容性比浏览器差很多，很多属性会被安全过滤。`<a name="...">` 是最古老的锚点方式，兼容性最好，但不能是空标签。

---

## 9. yum 源失效

**现象**：`yum install` 任何包都报 `Could not resolve host: mirrorlist.centos.org`。

**原因**：CentOS 7 已于 2024 年 6 月 30 日停止维护（EOL），官方镜像源全部下线。

**解决方案**：不要用 yum 装 Python，改用 Miniconda。Miniconda 自带独立 Python 环境，不依赖系统包管理器。

---

## 10. GLIBC 版本过低

**现象**：安装最新 Miniconda 报 `Installer requires GLIBC >=2.28, but system has 2.17`。

**原因**：CentOS 7 的 GLIBC 是 2.17（2014 年版本），无法运行新版 Miniconda 安装器。

**解决方案**：用兼容 CentOS 7 的老版本 Miniconda（Python 3.8）。

```bash
wget https://repo.anaconda.com/miniconda/Miniconda3-py38_4.12.0-Linux-x86_64.sh
bash Miniconda3-py38_4.12.0-Linux-x86_64.sh -b -p /opt/miniconda3
```

> 版本号选择逻辑：Miniconda3-py38 是为 GLIBC 2.17 编译的最后一代。

---

## 11. Python 类型注解

**现象**：`TypeError: 'type' object is not subscriptable`，报在 `def filter_new(articles: list[dict])`。

**原因**：Python 3.8 不支持 `list[dict]` 这种类型注解语法（需要 Python 3.9+）。

**解决方案**：在文件顶部加 `from __future__ import annotations`。

```python
from __future__ import annotations  # 让 Python 3.8 支持新式注解

def filter_new(articles: list[dict]) -> list[dict]:
    ...
```

需要在每个使用 `list[...]` 或 `dict[...]` 注解的文件加上这一行。

---

## 12. data 目录不存在

**现象**：`FileNotFoundError: No such file or directory: '/opt/daily-news-brief/data/news.log'`。

**原因**：`data/` 目录在 `.gitignore` 中，`git clone` 不会创建它。程序首次运行时目录不存在。

**解决方案**：在写入前创建目录。

```python
# logger.py
os.makedirs(LOG_DIR, exist_ok=True)

# storage.py
os.makedirs(DB_DIR, exist_ok=True)
```

> SQLite 的 `connect()` 会自动创建数据库文件，但不会创建中间目录。

---

## 13. git push 服务器

**疑问**：git 命令能把项目推到自己服务器上？

**解答**：可以。git 是分布式协议，不依赖 GitHub。只要服务器上有 bare repo，就能接收 push。

```bash
# 服务器：创建空仓库
mkdir -p /opt/daily-news-brief.git
cd /opt/daily-news-brief.git
git init --bare

# 本地：添加远程并推送
git remote add aliyun root@8.137.98.254:/opt/daily-news-brief.git
git push aliyun master

# 服务器：clone 出可读写的目录
cd /opt
git clone daily-news-brief.git daily-news-brief
```

`bare repo`（裸仓库）只存 git 元数据，没有工作目录。专门用来接收 push。需要 `git clone` 展开成看得见的文件夹。

---

## 14. rowcount 错误

**现象**：`AttributeError: 'sqlite3.Connection' object has no attribute 'rowcount'`。

**原因**：`rowcount` 是 Cursor 对象的属性，不是 Connection 的。

```python
# ❌ 错误
conn.execute("INSERT ...")
if conn.rowcount > 0:     # Connection 没有 rowcount

# ✅ 正确
cur = conn.execute("INSERT ...")
if cur.rowcount > 0:      # Cursor 有 rowcount
```

---

## 15. iCloud 收不到

**现象**：SMTP 返回发送成功，但 iCloud 邮箱收不到邮件。

**排查过程**：

- SMTP 无报错 → QQ 邮件服务器接受了投递
- iCloud 收件箱、垃圾邮件箱都没有 → 可能地址不对
- 检查 `.env` 发现 `TO_EMAIL=calvin.hriam@icloud.com`，但正确地址是 `calvin.hiram@icloud.com`（hriam vs hiram，两个字母颠倒了）

**教训**：邮件地址这类关键信息，初始化时要让用户确认。一个拼写错误就导致所有邮件石沉大海。

---

## 总结：跨环境兼容性是最花时间的

这个项目代码不到 500 行，但部署到 CentOS 7 上踩的坑最多：

| 问题类型                                       | 数量 |
| ---------------------------------------------- | ---- |
| Python 版本兼容（类型注解、GLIBC）             | 3    |
| 网络环境（NewsAPI 被墙、RSS 超时、yum 源下线） | 3    |
| LLM 调用（密钥、截断、JSON 解析、Prompt 质量） | 4    |
| 邮件客户端兼容（锚点、地址错误）               | 2    |
| 代码 bug（rowcount、目录不存在）               | 2    |

心得：**开发环境和生产环境尽可能一致**。用 Docker 可以避免 GLIBC、Python 版本等问题，但也会引入新的复杂度。对于这种小项目，直接在目标环境上测试更高效。

---

