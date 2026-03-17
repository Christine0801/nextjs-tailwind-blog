---
title: 'HTML 转 Markdown 如此简单'
date: 2026-03-16 13:39:35
lastmod: 2026-03-15 21:22:18 +0800
tags: [JavaScript, React.js]
draft: false
summary: '本文推荐 HTML 转为 markdown 的工具和实现方式，并找到了一个快捷技巧，收藏等于学会。'
images:
  [
    'https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a693e62730704370a3768213ec3f97ec~tplv-k3u1fbpfcp-watermark.image?',
  ]
authors: ['default']
layout: PostLayout
---

## 前言

现在好的技术文章非常多，每天各种技术群里，各种技术社区，有很多质量非常好的技术文章，比如 CSDN，掘金、微信公众号等， 于是我们就收藏了，收藏等于学会。

可是问题来了，我们收藏到哪呢？ CSDN 有了弹窗广告，掘金之前好的文章居然被删除了，其实最好的方式是将文章保存为 markdown，保存到自己的知识库中，或者可以上传自己的 github。

## 如何将文章将保存为 markdown ？

下面推荐 2 个工具非常好用可以将直接将 HTML 转为 markdown，大家可以收藏使用

- https://devtool.tech/html-md

- https://www.helloworld.net/html2md

![s17085102232022](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ffa39e9b9166475abddfbfd1bc955b5d~tplv-k3u1fbpfcp-zoom-1.image)

其实 devtool.tech 里面的每个工具都挺好用的。

## HTML 转 markdown 是如何实现？

其实有个包 [turndown](https://github.com/mixmark-io/turndown) 可以直接将 html 转为 markdown，并且可以在浏览器和 nodejs 中执行

### 安装

npm

```bash
npm install turndown
```

浏览器

```html
<script src="https://unpkg.com/turndown/dist/turndown.js"></script>
```

### 使用

```js
var TurndownService = require('turndown')

var turndownService = new TurndownService()
var markdown = turndownService.turndown('<h1>Hello world!</h1>')
```

直接将 html 字符串传入就可以了，返回 markdown 字符串

turndown 还支持配置规则， 比如

**保留标签**

```js
turndownService.keep(['del', 'ins'])
turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>')
// 'Hello <del>world</del><ins>World</ins>'
```

**移除标签**

```js
turndownService.remove('del')
turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>')
// 'Hello World'
```

## 插件

turndown 还支持插件的使用，官方就提供了 `turndown-plugin-gfm`,意思是 GitHub Flavored Markdown 功能是特点有：

- strikethrough 支持 `<strike>`, `<s>`, 和 `<del>` 标签，也就是删除线

- tables 支持表格

- taskListItems 支持任务列表，也就是 checkbox 任务

使用代码

```js
var TurndownService = require('turndown')
var turndownPluginGfm = require('turndown-plugin-gfm')

var gfm = turndownPluginGfm.gfm
var turndownService = new TurndownService()
turndownService.use(gfm)
var markdown = turndownService.turndown('<strike>Hello world!</strike>')
```

一般都要加上这个插件

## 开发一个类似的工具

其实使用 turndown 已经完成类似的功能，为了美观，我们可以给代码加上代码编辑器 [codemirror](https://codemirror.net/6/)

新的 codemirror6 完全重写，采用了插件化的形式，代码量更小，我用的技术栈是 react， 社区封装了一个好用的库 [rodemirror](https://www.npmjs.com/package/rodemirror)。

使用代码示例

```jsx
import { useMemo, useState } from 'react'
import CodeMirror from 'rodemirror'
import { basicSetup } from '@codemirror/basic-setup'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { markdown as langMarkdown } from '@codemirror/lang-markdown'

const Editor = () => {
  const extensions = useMemo(() => [basicSetup, oneDark, javascript(), langMarkdown()], [])

  const defaultValue = "console.log('Hello world!')"
  // remove if you do not need the value
  const [value, setValue] = useState(defaultValue)

  return (
    <CodeMirror
      value={defaultValue}
      onUpdate={(v) => {
        if (v.docChanged) {
          setValue(v.state.doc.toString())
        }
      }}
      extensions={extensions}
    />
  )
}

export default Editor
```

lang-javascript 下的包是让 CodeMirror 支持语法高亮。接下来就是配合 react 常规写法。效果如下

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fd603109cc644d9fbecfd1a5ae0c477b~tplv-k3u1fbpfcp-watermark.image?)

## 小结

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cb6480e922aa45ac96dcfdf7420bd8fd~tplv-k3u1fbpfcp-watermark.image?)

一个简易版的 html 转 markdown 编辑器就实现了，大家可以手动尝试实现一下。本文未涉及这些工具的内部实现原理，后续若遇到问题需要深入研究。

## 小技巧

常规的做法，是使用 chreome 控制台选中 article 标签就可以直接复制 html 了，但有时候如果 html 不规范，可能转换失败。

有时候有些文章 文章并不是在一个标签中，比如 [medium.com](https://medium.com/) 中的文章就不在一个标签中，这个时候，拷贝 HTML 就麻烦了。

**还有个问题**

Word 中的文档要转成 markdown 怎么办呢 ？

其实我们可以通过直接选中文本然后支持粘贴到 typora 中，然后就直接转成 markdown 了。

所以说了这么多，这个工具我没开发 😊。

以上就是本文全部内容，希望这篇文章对大家有所帮助，也可以参考我往期的文章或者在评论区交流你的想法和心得，欢迎一起探索前端。
