---
title: Navigator Clipboard 复制不生效
date: 2023/2/16 21:55:57
lastmod: 2023/2/16 22:55:57
tags: [前端, Bug, NavigatorAPI]
draft: false
summary: 使用 navigator.clipboard.writeText 完成复制功能的实现时，在本地测试没有问题，部署后报错navigator.clipboard Cannot read property ‘writeText‘ of undefined
images: https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230216215633874.png?
authors: ['default']
layout: PostLayout
---

  使用 navigator.clipboard.writeText 完成复制功能的实现时，在本地测试没有问题，部署后报错navigator.clipboard Cannot read property ‘writeText‘ of undefined

![image-20230216215633874](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230216215633874.png)

​	原因：Navigator API 的安全策略禁用了非安全域的 `navigator.clipboard` 对象，API 仅支持通过 HTTPS 提供的页面。为帮助防止滥用，仅当页面是活动选项卡时才允许访问剪贴板。活动选项卡中的页面无需请求许可即可写入剪贴板，但从剪贴板读取始终需要许可。

![image-20230216215831920](https://my-markdown-image-host.oss-cn-shanghai.aliyuncs.com/image-20230216215831920.png)

解决：判断当前环境是否支持navigator clipboard API，不允许则使用 `document.execCommand('copy')`进行剪贴板交互。使用兼容方案原因：navigator clipboard API是异步API，而使用`document.execCommand('copy')`进行剪贴板访问是同步的，只能读写 DOM，效率低下且在各浏览器之间还可能存在不同，在支持navigator clipboard API的情况下应尽量避免使用`document.execCommand('copy')`。



# 传入DOM ID

```javascript
export function copyCurrentTarget(text, id = '') {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
    } else {
        window.getSelection().removeAllRanges()
        const questionToCopy = document.querySelector('#' + id)
        const range = document.createRange()
        range.selectNode(questionToCopy)
        window.getSelection().addRange(range)
        try {
            const successful = document.execCommand('copy')
            if (successful) {
                console.log('复制成功')
            } 
        } catch (error) {
            console.error(error)
        }
    }
}
```

# 视口外创建一个新的DOM，传入要复制的内容

```javascript
function copyToClipboard(textToCopy) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(textToCopy)
    } else {
        let textArea = document.createElement("textarea")
        textArea.value = textToCopy
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        return new Promise((res, rej) => {
            document.execCommand('copy') ? res() : rej()
            textArea.remove()
        })
    }
}
```



# 扩展：安全和权限

  复制和粘贴权限已添加到 [Permissions API](https://developers.google.com/web/updates/2015/04/permissions-api-for-the-web) 中。当页面处于活动标签页时，会自动授予 `clipboard-write` 权限。 `clipboard-read` 权限必须手动请求。如果尚未授予权限，尝试读取或写入剪贴板数据的操作会自动提示用户授予权限。

```javascript
const queryOpts = { name: 'clipboard-read', allowWithoutGesture: false };
const permissionStatus = await navigator.permissions.query(queryOpts);
// 'granted', 'denied' or 'prompt':
console.log(permissionStatus.state);

permissionStatus.onchange = () => {
  console.log(permissionStatus.state);
};
```

  因为 Chrome 仅在页面是活动选项卡时才允许剪贴板访问，某些示例如果直接粘贴到 DevTools 中将无法运行，因为 DevTools 本身就是活动选项卡。有一个技巧：使用 `setTimeout()` 延迟剪贴板访问，然后在调用函数之前快速点击页面内部以将其聚焦：

```javascript
setTimeout(async () => {  const text = await navigator.clipboard.readText();  console.log(text);}, 2000);
```

  要在 iframe 中使用 API，需要使用[权限策略](https://w3c.github.io/webappsec-permissions-policy/)启用它

```javascript
<iframe
    src="index.html"
    allow="clipboard-read; clipboard-write"
>
</iframe>
```

  参考：https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined、https://developer.chrome.com/blog/cut-and-copy-commands/、https://web.dev/async-clipboard/

  原文：[Navigator Clipboard 复制不生效 – 我们的笔记 (xie.sh.cn)](https://xie.sh.cn/2022/04/22/navigator-clipboard-复制不生效/#:~:text=使用 navigator.clipboard.writeText 完成复制功能的实现时，在本地测试没有问题，部署后报错 navigator.clipboard Cannot read property ‘writeText‘,原因：Navigator API 的安全策略禁用了非安全域的 navigator.clipboard 对象，API 仅支持通过 HTTPS 提供的页面。)