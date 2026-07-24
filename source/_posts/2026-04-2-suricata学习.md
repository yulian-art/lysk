---
title: suricata学习
date: 2026-04-2 09:04:41
tags: 流量分析？




---

Suricata 是一种网络监控工具，可以检查和处理流经服务器的每个互联网流量数据包。它可以在检测到任何可疑活动时生成日志事件、触发警报并丢弃流量。

[ubuntu网络配置](https://blog.csdn.net/qq_59708181/article/details/149809612)

```
{
        "dst": "default",
        "gateway": "192.168.42.2",
        "dev": "ens33",
        "protocol": "static",
        "metric": 100,
        "flags": [ ]
    }
```

启动过程正常完成，但缺少了 `All AFP capture threads are running.` 这条信息。这通常是因为 **当前的捕获模式不是 AF_PACKET**，而是其他模式PCAP。

但是我配好了啊

```
 grep 2100498 /var/log/suricata/fast.log
grep: /var/log/suricata/fast.log: Permission denied

```

sudo提权

还有一些所谓的应用层协议或者第七层协议可以选择，它们包括:

- http
- ftp
- tls (this includes ssl)
- smb
- dns
- dcerpc
- ssh
- smtp
- imap
- msn
- modbus (默认禁用)
- dnp3 (默认禁用)
- enip (默认禁用)
- nfs (取决于rust是否可用)
- ikev2 (取决于rust是否可用)
- krb5 (取决于rust是否可用)
- ntp (取决于rust是否可用)
- dhcp (取决于rust是否可用)

这些协议是否可用取决于协议是否在suricata.yaml配置文件中启用。

action主要有这个：

- alert 生成一个告警
- pass 停止对包的进一步检查，并跳到所有规则的末尾
- drop 丢弃数据包并产生告警
- reject 向匹配报文的发送端发送RST/ICMP不可抵达错误

在IPS模式下，使用任何拒绝动作也会启用drop。

header部分定义协议，IP地址，端口和规则的方向：

- 注明协议种类，只要是tcp、udp、icmp、ip等
- Any：源地址/目的地址（IP）
- Any：源端口/目的端口
- ->：方向，单向流量；<>双向流量
- Any：源地址/目的地址（IP）
- Any：源端口/目的端口

rule options定义规则的细节：

- msg：警报消息，当规则匹配时输出的消息
- flow：流量匹配选项，指定规则匹配的流量特征，如是否已建立等
- content：规则匹配的内容
- classtype：规则的分类类型，由 classification.config 文件定义
- sid：用于唯一性规则标识
- rev：规则版本号