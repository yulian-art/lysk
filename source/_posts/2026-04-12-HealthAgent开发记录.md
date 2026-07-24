---
title: HealthAgent开发记录
date: 2026-04-12 09:04:41
tags: 开发








---



x

没有一点自己的思路，全靠记忆，有思路的是开发工程师，没思路的是cv码农，不对，是aiAgent。

# 下一步如何调试

比如我输入“我今天血压120/80”但是却返回“请告诉我你的血压值，例如120/80”

程序已经识别出这是“血压相关请求”，但是 `healthTool.containsBloodPressure(cleanInput)` 返回了 `false`。

先在 `AgentOrchestrator.java` 里加日志。文件顶部加：

```
import android.util.Log;
```

```
E:\java_practice\HealthAgent\app\src\main\java\com\julien\healthagent\tools\HealthTool.java:72: 错误: 无法访问的语句
            Log.d("HealthAgent", "文本为空，返回invalid");
            ^
```

**问题原因**：
在 `if(text == null)` 分支中， **先写了 `return`**，然后又写了 `Log.d`。一旦 `text` 为 `null`，方法会立刻返回，后面的 `Log.d` 根本没有机会运行，所以编译器报错“无法访问的语句”。

调试看logcat

找这三样东西：`FATAL EXCEPTION: main`、异常类型、第一条指向你自己代码的 `at com.julien.healthagent...`。

结合你前面的情况，我判断你现在很可能已经修掉了正则问题，程序开始真正走到 `handleBloodPressureRecord()` 后半段了。也就是说，新的崩溃大概率出在**数据库写入**这一段，而不是血压解析本身。最常见的是这种错误：

```
android.database.sqlite.SQLiteException: no such table: bp_records
```

如果是这个，原因通常是你之前装过旧版本 app，本地数据库已经生成，但表结构和你现在代码不一致。解决方法很直接：先把手机里的这个 app 卸载，再重新运行。或者把 `DatabaseHelper` 里的 `DATABASE_VERSION` 从 `1` 改成 `2`，让它触发升级逻辑。

```
SQLiteException: AUTOINCREMENT is only allowed on an INTEGER PRIMARY KEY
while compiling:
CREATE TABLE bp_records(idINTEGER PRIMARY KEY AUTOINCREMENT,systolicINTEGER NOT NULL,dicstolicINTEGER NOT NULL,pulseINTEGER,create_at INTEGER NOT NULL)
```

ok啊跑通了，好多单词拼写错误

# 先补核心场景，再补智能度，最后补展示效果”的顺序推进。

加两个能力：一个是“查看最近一次血压”，一个是“查看历史记录条数”或最近三条。

加这几句输入的处理：

“我最近一次血压是多少”
 “帮我看看我今天的血压记录”
 “我一共记录了几次血压”

需要在 `DatabaseHelper` 里补查询方法，在 `HealthTool` 里补查询回复，在 `AgentOrchestrator` 里补一个查询分支。

# 三阶段：开始做提醒模块

有三大块：血压记录、用药提醒、健康查询。现在血压这条线已经打通，接下来最应该做的是**用药提醒**，因为它比健康问答更容易落地，而且很适合安卓端展示。

先写 `TimeParser.java`，只支持几个最常用表达，比如“今晚8点”“明天早上7点”“20:00”。
 再写 `ReminderTool.java`，负责解析时间和药品名。
 然后写 `NotificationTool.java`，负责创建通知渠道和发通知。
 接着写一个 `BroadcastReceiver`，比如 `ReminderReceiver.java`，让 `AlarmManager` 到点后真正触发通知。
 最后把它们接进 `AgentOrchestrator`。

用户输入“今晚8点提醒我吃药”
 → 识别为提醒意图
 → 解析时间
 → 注册闹钟
 → 到点弹通知

# 四阶段：把多轮对话真正做出来

前面已经有 `DialogState` 了，但目前更多还是“占位”。

最典型的多轮场景有两个。

一个是提醒信息不全。比如用户说：“提醒我吃药。”系统应该问：“几点提醒？”
 另一个是血压信息不全。比如用户说：“帮我记一下血压。”系统应该问：“请告诉我血压值，例如 120/80。”

这一步的关键不是写很多 if-else，而是让状态转换清楚。至少要做到：系统知道当前正在补什么信息，补完后继续完成上一轮任务，而不是把新输入当成全新指令。

如果这块做得好，被拷打时可以很自然地说：项目不是简单命令词匹配，而是具备端侧轻量多轮交互能力。

# 五阶段：再做健康查询，但先做本地版

先支持这些问题：

“高血压要注意什么”
 “吃降压药要注意什么”
 “血压高了怎么办”

实现上可以很简单：本地写一个 `Map<String, String>`，或者一个 `faq.json` 放在 `assets` 里。先根据关键词给固定回答。这样很快就能把第三个场景补齐。

等前面三个主场景都跑通了，再考虑做更智能的问答。

# 六阶段：这时候再接 MobileBERT

把 `IntentClassifier` 抽成一个独立接口，然后保留两种实现：

一种是规则版分类器。
 一种是 TFLite MobileBERT 分类器。

运行时可以先用模型分类；如果置信度不够高，就回退到规则版。这会比单纯全靠模型稳定得多，也更符合“小模型 + 工程增强”的比赛路线。

# 七阶段：把代码结构再整理一遍

前面那些代码是为了先跑通，现在项目开始长起来了，就该做一次小重构

把职责再收紧一点。

`AgentOrchestrator` 负责总调度，不要写具体解析细节。
 `HealthTool` 负责健康场景业务，不要关心界面。
 `DatabaseHelper` 只做存取，不要拼回复文案。
 `BloodPressureParser`、`TimeParser` 只做解析。
 `DialogState` 只存状态，不做业务判断。

这一步做完，后面接 `ReminderTool` 和 `IntentClassifier` 时会舒服很多。

# 反正最近什么也不想学，课内知识更是听不进去，越拖越多，不如压力自己

# 完善血压功能

先改 `UserIntent.java`，再加DatabaseHelper.java

已经有 `insertBloodPressure()`，那就在同一个类里直接新增下面这个内部类和方法