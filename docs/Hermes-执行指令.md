# MoodWave 校园情绪数据爬取 - Hermes Agent 执行指令

> 本文件供 Hermes Agent 直接执行使用
> 更新日期：2026-04-28

---

## 🎯 任务目标

从**小红书/微博/知乎**三大平台爬取校园情绪相关数据，存入腾讯云服务器的 PostgreSQL 数据库。

---

## 1️⃣ 环境准备

```bash
# 激活 Python 环境
conda activate moodwave  # 或 source venv/bin/activate

# 安装依赖
pip install requests psycopg2-binary fake-useragent

# 检查项目目录
cd /root/moodwave
ls -la
```

---

## 2️⃣ 数据库配置

### 连接信息
```
数据库: PostgreSQL
地址: localhost:5432
数据库名: moodwave
用户名: moodwave
密码: (已在 .env 或环境变量中)
```

### 建表（如表不存在）
```sql
CREATE TABLE IF NOT EXISTS trend_data (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    topic VARCHAR(50) NOT NULL,
    mood_type VARCHAR(50),
    title TEXT,
    content TEXT,
    author VARCHAR(100),
    publish_date DATE,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    sentiment_score FLOAT,
    url VARCHAR(500),
    scraped_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_platform ON trend_data(platform);
CREATE INDEX IF NOT EXISTS idx_trend_topic ON trend_data(topic);
CREATE INDEX IF NOT EXISTS idx_trend_mood ON trend_data(mood_type);
CREATE INDEX IF NOT EXISTS idx_trend_scraped ON trend_data(scraped_at);
```

---

## 3️⃣ 爬取关键词

基于问卷调查痛点数据设计：

| 主题 | 关键词 | 问卷依据 |
|------|--------|---------|
| 考研 | 考研焦虑、考研失败、考研二战 | 就业/考研焦虑 72.4% |
| 期末 | 期末焦虑、考试周、大学期末 | 学业压力 66.7% |
| 求职 | 找不到工作、春招迷茫、应届生就业 | 就业焦虑 |
| 情感 | 分手孤独、暗恋、宿舍关系 | 人际关系 32.4% |
| 情绪 | 崩溃、破防、深夜emo | 每周负面情绪 78.1% |
| 自我 | 内耗、自我否定、容貌焦虑 | 自我否定 47.6% |

---

## 4️⃣ 各平台爬取方式

### 小红书 ✅ 最简单
**工具**: WorkBuddy 小红书MCP

```bash
# 检查MCP是否可用
mcp list

# 搜索笔记示例
mcp__xiaohongshu__search_notes keyword="考研焦虑" limit=30
```

**限制**:
- 单次最多30条
- 间隔2秒/请求
- 部分笔记需登录

---

### 微博 ⚠️ 需要Cookie
**两种模式**:

#### 模式A: 热搜榜单（无需登录）
```python
import requests

def scrape_weibo_hot():
    url = "https://weibo.com/ajax/statuses/hot_band"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://weibo.com"
    }
    resp = requests.get(url, headers=headers)
    return resp.json()
```

#### 模式B: 话题广场（需要Cookie）
```bash
# 设置Cookie环境变量
export WEIBO_COOKIE="从浏览器复制的长Cookie字符串"
```

**微博话题标签**:
```
#考研# #考研焦虑# #考研成绩#
#期末# #考试周# #大学生期末#
#找不到工作# #春招# #应届生#
#emo# #深夜emo# #内耗# #焦虑#
#大学# #大学生# #室友# #宿舍#
```

---

### 知乎 ⚠️ 有反爬
**反爬策略**:
1. 轮换 User-Agent（准备10+个）
2. 每次请求间隔 3-5 秒
3. 遇到 429 错误等待 30 秒重试

```python
import requests
import random
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
]

def scrape_zhihu(keyword):
    url = f"https://www.zhihu.com/api/v4/search_v3?t=general&q={keyword}&correction=1"
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Referer": "https://www.zhihu.com"
    }
    time.sleep(random.uniform(3, 5))
    resp = requests.get(url, headers=headers)
    return resp.json()
```

**知乎搜索词**:
```
考研焦虑、考研二战、研究生
找不到工作、offer选择、应届生就业
分手、大学恋爱、暗恋表白
大学室友、宿舍矛盾、孤独
情绪崩溃、内耗、自我怀疑
```

---

## 5️⃣ 数据入库代码

```python
import psycopg2
import os
from datetime import datetime

def save_to_postgres(data_list):
    db_url = os.getenv("DATABASE_URL") or "postgresql://moodwave:密码@localhost:5432/moodwave"
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    for item in data_list:
        cur.execute("""
            INSERT INTO trend_data
            (platform, keyword, topic, mood_type, title, content,
             author, publish_date, likes, comments, url, scraped_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            item["platform"],
            item["keyword"],
            item["topic"],
            item.get("mood_type"),
            item.get("title"),
            item.get("content"),
            item.get("author"),
            item.get("publish_date"),
            item.get("likes", 0),
            item.get("comments", 0),
            item.get("url", "")
        ))

    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ 成功存入 {len(data_list)} 条数据")
```

---

## 6️⃣ 定时任务配置

```bash
# 编辑 crontab
crontab -e

# 添加以下任务
# 每天早上 8:00 执行
0 8 * * * cd /root/moodwave && python scraper/moodwave_scraper.py >> /root/logs/scrape.log 2>&1

# 微博晚上8点追加一次
0 20 * * * cd /root/moodwave && python scraper/moodwave_scraper_weibo.py >> /root/logs/scrape_weibo.log 2>&1
```

---

## 7️⃣ 重要注意事项

### ⚠️ 爬取限制

| 平台 | 请求间隔 | 单次上限 | 备注 |
|------|---------|---------|------|
| 小红书 | 2秒 | 30条 | MCP自动处理 |
| 微博 | 3-5秒 | - | Cookie有效期7天 |
| 知乎 | 3-5秒 | - | 429时等待30秒 |

### 🔒 安全要求

1. **隐私保护**: 爬取数据仅供内部分析，不公开原始内容
2. **Cookie更新**: 微博Cookie每周手动更新一次
3. **频率控制**: 严格遵守请求间隔，避免封禁
4. **数据备份**: 定期备份PostgreSQL数据

### ❌ 不要做

- 不要爬取明显广告/营销内容
- 不要高频请求触发反爬
- 不要公开分享原始数据
- 不要爬取包含个人隐私的信息

---

## 8️⃣ 验证结果

完成后请汇报：
1. 小红书爬取数量: ___ 条
2. 微博爬取数量: ___ 条
3. 知乎爬取数量: ___ 条
4. 总计存入数据库: ___ 条
5. 如有报错，请附上错误日志

---

## 📞 联系方式

如有问题，联系项目负责人：
- 项目名: MoodWave 灵音
- 数据库: PostgreSQL @ 腾讯云服务器
- 前端展示: Vercel/CloudBase
