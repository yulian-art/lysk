---
title: postgresql学习
date: 2026-05-9 09:04:41
tags: 开发



---

**x**

## 有索引后发生了什么

执行：

```
CREATE INDEX idx_users_email ON users(email);
```

数据库会单独建一张**索引目录表**：

把所有 `email`**提前排序**，并记录好**每行数据在磁盘的位置**。

结构类似这样：

```
email字段(已排序)      数据物理位置
a1@qq.com              第38行
a2@qq.com              第105行
abc@qq.com             第209行
...
```

### 查询时变成了：

1. 去**索引目录**里用**二分查找**
2. 有序数据里找目标 email，**不用逐条遍历**
3. 找到后直接拿物理位置，**定位到原表那一行**

**100 万条数据**：

- 全表扫描：最坏扫 100 万次
- 索引二分查找：只要 **20 次左右** 就找到了

速度差距是**几万倍**。

```
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    feishu_open_id VARCHAR(128) NOT NULL UNIQUE,
    feishu_union_id VARCHAR(128) NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    avatar_url VARCHAR(512) NULL,
    email VARCHAR(128) NULL,
    department VARCHAR(128) NULL,
    employee_no VARCHAR(64) NULL,

    status VARCHAR(32) NOT NULL DEFAULT 'active',
    -- active 正常
    -- disabled 禁用

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**numeric(10,2)**

高精度小数，**最多 10 位数字，保留 2 位小数**，和 `decimal(10,2)` 作用一样，适合存金额。

## 为什么要 “快照”？

举个真实场景：

1. 今天：手机卖 **1000 元**，用户下单
2. 明天：商家把手机改成 **1200 元**

如果不存快照：

订单查价格时直接读商品表 → 订单价格也变成 1200，**用户就亏了，对账全乱了**。

有了**商品金额快照**：

下单时把 `1000` 存到订单里，**永远是 1000**，商品涨价降价都不影响旧订单。