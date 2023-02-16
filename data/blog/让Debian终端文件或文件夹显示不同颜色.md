---
title: 让Debian终端文件显示不同颜色
date: 2023/2/15 21:55:57
lastmod: 2023/2/15 22:55:57
tags: [Linux, Terminal, Debian]
draft: false
summary: 在我们使用Linux不同发行版时，如CentOS、Ubuntu或者Debian，我们使用ls命令，有时候会发现列举出来的文件都会带有颜色，那如果没有颜色就需要配置一下。
images: https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230215164529241.png?
authors: ['default']
layout: PostLayout
---

# 前言

  在我们使用Linux不同发行版时，如CentOS、Ubuntu或者Debian，我们使用**ls**命令，有时候会发现列举出来的文件都会带有颜色，那如果没有颜色就需要配置一下。

# 修改.bashrc文件

使用**vim**命令编辑

```bash
vim /root/.bashrc
```

修改如下

```bash
#export LS_OPTIONS='--color=auto'
#eval `dircolors`
#alias ls='ls $LS_OPTIONS'
#alias ll='ls $LS_OPTIONS -l'
#alias l='ls $LS_OPTIONS -lA'
```

把上面的行注释（#号）全都去掉就可以了，然后使用**source**命令刷新即可

```bash
source /root/.bashrc
```

接下来就会发现**ls**命令列举出的文件、文件夹都会带有颜色

![image-20230215164529241](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230215164529241.png)

