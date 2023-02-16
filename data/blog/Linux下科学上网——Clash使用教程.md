---
title: Linux下科学上网——Clash使用教程
date: 2023/2/14 19:04:51
lastmod: 2023/2/14 19:10:00
tags: [Linux, Clash]
draft: false
summary: 前言 在Windows下我们科学上网很简单，只需要下载一个VPN或者一个代理软件比如V2Ray、Clash等等，但是在Linux上却比较麻烦，这里我将为大家分享Linux终端界面上如何开启代理进行科学上网
images: https://th.bing.com/th/id/OIP.oyOF3Mvy-oGDOV6oOilj1wHaDt?pid=ImgDet&rs=1?
authors: ['default']
layout: PostLayout
---
# 前言

  在Windows下我们科学上网很简单，只需要下载一个VPN或者一个代理软件比如V2Ray、Clash等等，但是在Linux上却比较麻烦，这里我将为大家分享Linux终端界面上如何开启代理进行科学上网

# 一、下载Clash

1、我们可以在Clash作者的Github仓库下载Clash对应操作系统版本的Clash工具，[点击这里直达](https://mojie.buzz/#/register?code=DgQ9NRkT)。

这个页面下拉我们可以看到很多不同的版本，有Windows、Linux等等，还有ARM架构、AMD架构等等，选择合适的版本即可，如果没有合适的可以点击**Show all**查看，这里我们选择的是AMD64版本。

![image-20230214181117255](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214181117255.png)

然后将下载好的压缩包上传到我们的服务器上，我将它放在了**/usr/**下面。

或者我么也可以使用**wget**命令更加简单：

- 首先获取到压缩包的下载链接

![image-20230214181514160](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214181514160.png)

- 然后将他拼接到**wget**命令后面

```bash
cd /usr/
wget https://github.com/Dreamacro/clash/releases/download/v1.13.0/clash-linux-amd64-v1.13.0.gz
```

2、下载完成之后我们解压这个.gz文件，你们也可以把文件放到其他地方去，我这里的习惯是放在/usr/下面。

```bash
cd /usr/
tar -zxvf clash-linux-amd64-v1.13.0.gz
```

然后将解压出来的文件**重命名为clash**，并**赋予可执行权限**

```bash
mv clash-linux-amd64-v1.13.0 clash
chmod +x clash
```

到了这一步，我们的clash就安装完成了

3、安装完成之后我们先启动一次Clash

```bash
cd /usr/
./clash
```

启动之后再按Ctrl + C终止服务，Clash就会在**~/.config/clash**目录生成配置文件

```bash
-rw-r--r-- 1 root root  118929 Feb 14 13:24 config.yaml
-rw-r--r-- 1 root root 3878104 Feb 14 13:13 Country.mmdb
```



# 二、配置Clash

1、当我们在某个机场网站购买了一个VPN服务之后，网站会给我们一个**订阅链接**，我们可以使用这个订阅链接下载配置文件。

这里我给大家推荐一个，[魔戒]([魔戒.net (mojie.buzz)](https://mojie.buzz/#/register?code=DgQ9NRkT))，限量不限时，流量用完为止，非常适合我们学习和查阅论文、资料使用。

获取配置文件也有两种方法：

- 1.第一种就是在浏览器的地址栏输入我们的**订阅链接**并且在后面拼接**&flag=clash**，然后回车，浏览器就会自动下载配置文件。

![image-20230214183055359](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214183055359.png)

浏览器就会自动下载配置文件，然后我们把下载好的配置文件放到服务器上去，我这里放在了**/root/**目录下

然后我们将配置文件内容输出到Clash生成的配置文件中去

```bash
cat /root/魔戒.net > ~/.config/clash/config.yaml
```

- 2.第二种就是使用**wget**命令，这种更方便更快

```bash
wget -O ~/.config/clash/config.yaml "clash的订阅链接"
```

链接需要带双引号
然后是下载Country.mmdb
```bash
wget -O ~/.config/clash/Country.mmdb https://www.sub-speeder.com/client-download/Country.mmdb
```

2、接下来我们需要配置HTTP代理和HTTPS代理。配置之前我们需要查看config.yaml配置文件的端口设置。有的是**http 7890**和**sockets 7891**（https），有的文件则是混合端口**mixed-port 7890**。所以我们需要找到这几个参数，一般都是在配置文件的前几行就可以看见，我们使用**head**命令查看前10行看看

```bash
head -n 10 ~/.config/clash/config.yaml
```

![image-20230214183916834](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214183916834.png)

可以看见，我这里是混合端口**mixed-port 7890**

然后我们要配置全局代理，编辑**/etc/profile**，如果大家的配置文件中是**http 7890** 和 **sockets 7891** 记得替换对应的端口号

```bash
export http_proxy="127.0.0.1:7890"
export https_proxy="127.0.0.1:7890"
```

将上面的环境变量写到**/etc/profile**中，但是一般我们的做法都是新建一个自己的环境变量配置文件，操作如下

```bash	
vim /etc/profile.d/my_env.sh
```

这个**my_env.sh** 就是我们自己的配置文件

然后将上面两行复制进去，保存退出，使用以下命令立即生效

![image-20230214185038156](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214185038156.png)

```bash
source /etc/profile
```

3、然后我们就可以启动clash了

```bash	
/usr/clash -d .
```

![image-20230214184744617](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214184744617.png)

这样我们的Clash就启动成功了

我们也可以使用nohup命令让他挂载到后台

```bash
nohup /usr/clash -d . > /usr/clash-log.log &
```

以上命令意思是后台启动并将打印日志信息输出到**clash-log.log**中

4、启动成功后我们可以使用**curl**命令来测试一下，以Google为例

```bash
curl https://www.google.com.hk/
```

如果有返回信息，则说明成功了

![image-20230214185401187](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214185401187.png)

5、有些软件不走系统代理，我们需要单独设置，以**git**为例

```bash
git config --global http.proxy 'http://127.0.0.1:7890'
```
# 三、关闭Clash
关闭Clash也分两种情况，一种是完全关闭Clash，另一种就是取消Clash代理流量，但是Clash仍然在后台运行

- 1、先说第一种

​		直接杀死Clash进程，用**ps**命令获取clash的pid，然后用**kill**命令杀死

```bash
ps -ef | grep clash | grep -v 'grep'
kill -9 258907
```

![image-20230214211002876](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230214211002876.png)

然后再关闭代理端口

```bash
unset http_proxy
unset https_proxy
```

如果不关闭的话，会导致没有网络

- 2、再说第二种

​		其实就是第一种省却了第一步，不杀死Clash进程，只关闭代理端口，下次要用的话再使用**source**命令就好了

```bash
unset http_proxy
unset https_proxt
```

​		如果想再次使用就source一下

```bash
source /etc/profile
```

​		因为http_proxy、https_proxy已经写到全局变量里面了
