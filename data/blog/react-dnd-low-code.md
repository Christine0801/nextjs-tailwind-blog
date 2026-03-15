---
title: '使用 React-DnD 打造简易低代码平台'
date: 2026-03-14 22:45:13
lastmod: 2022-02-25 23:36:25 +0800
tags: [前端, React.js]
draft: false
summary: '前言 2016年起，低代码概念开始在国内兴起，当年该行业总共有 10 起融资事件，之后低代码行业融资笔数整体呈上升趋势，并在2020年增长至14起，其中亿元以上融资有13起。'
images:
  [
    'https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad851846133540e7aeb01f43c8c77e7a~tplv-k3u1fbpfcp-watermark.image?',
  ]
authors: ['default']
layout: PostLayout
---

## 前言

2016 年起，低代码概念开始在国内兴起，当年该行业总共有 10 起融资事件，之后低代码行业融资笔数**整体呈上升趋势**，并在 2020 年增长至 14 起，其中**亿元以上融资有 13 起**。

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e59865c29f224d0b8ab4e8e4dd479eaa~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb79950b5b7945b2b4e681843313bc96~tplv-k3u1fbpfcp-watermark.image?)

从融资轮次分布上看，2016 年天使轮、种子轮、A 轮和 B 轮融资占比为 50%，而到 2020 年，其占比则达到 78.6%，相比 2016 年上升了 28.6%。这可以说明**低代码市场整体仍处于发展初期** 。

2021 年很多公司，不管大小，都开始开发低代码平台。低代码即无需代码或只需要通过少量代码，通过“拖拽”的方式即可快速生成应用程序。那么对于开发者而言，我们应该如何入手开发呢？

## “拖拽”实现

关键词就是“拖拽”，其实“拖拽”的交互方式早在 Jquery 时代就有，关于拖拽在前端实现主要分为 2 种

1. 是以 [jquery-ui](https://jqueryui.com/draggable/) 为代表的 draggable 和 Droppable，其原理是通过鼠标事件 mousedown、mousemove、mouseup 或者 触摸事件 touchstart、touchmove、touchend，记录开始位置和结束位置、以达到拖拽传递数据的效果。

2. 是通过 [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

下面是简单实现代码

```html
<script>
  function dragstart_handler(ev) {
    // A将目标元素的 id 添加到数据传输对象
    ev.dataTransfer.setData('application/my-app', ev.target.id)
    ev.dataTransfer.effectAllowed = 'move'
  }
  function dragover_handler(ev) {
    ev.preventDefault()
    ev.dataTransfer.dropEffect = 'move'
  }
  function drop_handler(ev) {
    ev.preventDefault()
    // 获取目标的 id 并将已移动的元素添加到目标的 DOM 中
    const data = ev.dataTransfer.getData('application/my-app')
    ev.target.appendChild(document.getElementById(data))
  }
</script>

<p id="p1" draggable="true" ondragstart="dragstart_handler(event)">This element is draggable.</p>
<div id="target" ondrop="drop_handler(event)" ondragover="dragover_handler(event)">Drop Zone</div>
```

更高级的功能是： Drop API 还支持直接从系统桌面直接拖拽文件到浏览器中，使用 [DataTransfer.files ](https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer/files)实现拖拽上传。

## React-dnd

[React DnD](https://react-dnd.github.io/react-dnd/about) 是 React 和 Redux 核心作者 Dan Abramov 创造的一组 React 工具库，可以帮助您构建复杂的拖放接口，同时保持组件的解耦性。
例如，React DnD 没有提供一个排序组件，相反，它为您提供了所需的工具。

### 官方 demo

一起来看下简单实现

![2022-01-18 12-44-15.2022-01-18 12_45_08.gif](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad5d74e39ae94ce8b292d45473969dd4~tplv-k3u1fbpfcp-watermark.image?)

首先需要在项目根节点设置拖拽实现方式

```jsx
import { render } from 'react-dom'
import Example from './example'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

function App() {
  return (
    <div className="App">
      <DndProvider backend={HTML5Backend}>
        <Example />
      </DndProvider>
    </div>
  )
}
```

如果是手机端就要使用 `react-dnd-touch-backend`，因为 `react-dnd-html5-backend`不支持触摸

### DragBox 的实现

```jsx
import { useDrag } from 'react-dnd'
import { ItemTypes } from './ItemTypes'
const style = {
  cursor: 'move',
}
export const Box = function Box({ name }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BOX,
    item: { name },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      if (item && dropResult) {
        alert(`You dropped ${item.name} into ${dropResult.name}!`)
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      handlerId: monitor.getHandlerId(),
    }),
  }))
  const opacity = isDragging ? 0.4 : 1
  return (
    <div ref={drag} style={{ ...style, opacity }}>
      {name}
    </div>
  )
}
```

- 这里的 `type` 就是一个字符串，用于约束“拖”和“放”组件的关系，如果字符串不一致就无法回调事件，主要是为了避免页面中多个拖放的实例
- `item` 就是拖动时候传递的数据
- `end` 是拖放结束后的回调
- `collect` 用于获得拖动的状态，可以设置样式

### DropContainer 实现

```jsx
import { useDrop } from 'react-dnd';
import { ItemTypes } from './ItemTypes';

const style = {
    ...
};
export const DropContainer = () => {
    const [{ canDrop, isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.BOX,
        drop: () => ({ name: 'Dustbin' }),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));
    const isActive = canDrop && isOver;
    let backgroundColor = '#222';
    if (isActive) {
        backgroundColor = 'darkgreen';
    }
    else if (canDrop) {
        backgroundColor = 'darkkhaki';
    }
    return (<div ref={drop} role={'Dustbin'} style={{ ...style, backgroundColor }}>
			{isActive ? 'Release to drop' : 'Drag a box here'}
        </div>);
};
```

- `type` 与拖动的 type 相同
- `drop` 函数返回放置节点的数据，返回数据给 drag end
- `collect` 用于获得拖动状态的状态，可以设置样式

## 低代码实现

回到我们的低代码主题，我们来一起看下**钉钉宜搭**的页面设计

![MacBook Pro 14_ - 1 (2).png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ac93bdb1113d40b1955cb665c09c80b5~tplv-k3u1fbpfcp-watermark.image?)

主要分为 3 个区域：左侧组件区、中间设计区、右侧编辑区。如果只看左侧组件区和中间的设计区是否跟 react-dnd 官方的 demo 很相似呢？

### 定义 JSON

接下来我们要：

- 定义可拖动的组件类型
- 每个组件类型对应的渲染组件
- 每个组件的属性设置

先来定义几个可拖动的字段吧，比如最基本的数据类型，div、h1、 p 标签都是一个组件，那就我先定义出以下字段类型，

```js
const fields= [
  {
    type: 'div',
    props: {
      className: '',
    },
  },
  {
    type: 'h1',
    props: {
      className: 'text-3xl',
      children: 'H1',
    },
  },

  {
    type: 'p',
    props: {
      className: '',
      children: '段落111',
    },
  }
  ...
]
```

针对这些拖动字段，需要有渲染的组件，而针对 div、h1、 p 这些就是标签本身，但是我们需要用 react 封装成组件

```jsx
const previewFields = {
  div: (props: any) => <div {...props} />,
  h1: (props: any) => <h1 {...props} />,
  p: (props: any) => <p {...props} />,
  ...
}
```

右侧边界区域的可配置字段

```js
const editAreaFields = {
    div: [
      {
        key: 'className',
        name: '样式',
        type: 'Text',
      },
    ],
    h1: [
      {
        key: 'children',
        name: '内容',
        type: 'Text',
      },
    ],
    p: [
      {
        key: 'children',
        name: '内容',
        type: 'Text',
      },
      {
        key: 'className',
        name: '样式',
        type: 'Text',
      },
    ],
    ...
}
```

上述字段代表 div 只能设置 className、h1 只能设置内容、p 标签既能设置内容，也可以设置 className。
右侧区域的也可以配置不同的组件，比如 Text 就渲染成最简单的 Input。

### 嵌套拖动

基本组件一般可以嵌套的，比如我现在想要拖动出下图的页面效果

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9f41f5d8fd72412795a8b3df15aa4b97~tplv-k3u1fbpfcp-watermark.image?)

实际上我需要生成 JSON 树，然后根据 JSON 树渲染出页面。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ee025ee04504834965ea5a63f00c142~tplv-k3u1fbpfcp-watermark.image?)

当每次拖动的时候，可以生成一个 `uuid`，然后使用**深度优先遍历树数据**
从根节点到叶子节点的由上至下的深度优先遍历树数据。在放置的组件，然后操作数据

```ts
export const traverse = <T extends { children?: T[] }>(data: T, fn: (param: T) => boolean) => {
  if (fn(data) === false) {
    return false
  }

  if (data && data.children) {
    for (let i = data.children.length - 1; i >= 0; i--) {
      if (!traverse(data.children[i], fn)) return false
    }
  }
  return true
}
```

### 丰富组件

可以使用开源组件，集成到低代码中，我们只需要定义右侧编辑区域和左侧字段数据，比如现在集成 [@ant-design/charts](https://charts.ant.design/zh/docs/manual/getting-started)

以柱状图为例，我们定义下拖动的字段数据

```js
{
type: 'Column',
module: '@ant-design/charts',
h: 102,
displayName: '柱状图组件',
props: {
  xField: 'name',
  yField: 'value',
  data: [
    {
      name: 'A',
      value: 20,
    },
    {
      name: 'B',
      value: 60,
    },
    {
      name: 'C',
      value: 20,
    },
  ],
},
```

渲染 直接可以使用`import { Column } from '@ant-design/charts';`
props 增加默认数据就可以直接渲染出漂亮的柱状图了。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b5797f9b7fe14af4a43f282d33ae48a7~tplv-k3u1fbpfcp-watermark.image?)

然后增加一个数据编辑的组件，最后的效果如下图

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4c1be426a3ff43deaffbb351fe82b2b4~tplv-k3u1fbpfcp-watermark.image?)

### 生成代码

有了 JSON 树，我们也可以生成想要的视图代码。组件`类型 + props + 子组件`的数据，
每个节点的代码就是这段字符串拼接而成。

`<${sub.type}${props}>${children}</${sub.type}>`

而 props 也可以拼接成 `key=value` 的形式。遍历数据要 从叶子节点到根节点的由下而上的深度优先遍历树数据。

### 代码格式化

我们可以使用 prettier 来格式化代码，下面代码是将格式化代码的逻辑放到一个 `webWork` 中。

```js
importScripts('https://unpkg.com/prettier@2.2.1/standalone.js')
importScripts('https://unpkg.com/prettier@2.2.1/parser-babel.js')

self.addEventListener(
  'message',
  function (e) {
    self.postMessage(
      prettier.format(e.data, {
        parser: 'babel',
        plugins: prettierPlugins,
      })
    )
  },
  false
)
```

## 预览

代码有了，接下来就可以渲染页面进行预览了，对于预览，显然是使用`iframe`，`iframe`除了`src`属性外，`HTML5`还新增了一个属性`srcdoc`，用来渲染一段`HTML`代码到`iframe`里

```js
iframeRef.value.contentWindow.document.write(htmlStr)
```

## 效果

拖拽一个表格 和一个柱状图

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f8ce656f40f34772a25ab073c80a8a90~tplv-k3u1fbpfcp-watermark.image?)

查看代码

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1ea6402644f94fd19a08df5c061b8b83~tplv-k3u1fbpfcp-watermark.image?)

最后附上 github 和预览地址

- 📕 仓库地址: [github.com](https://github.com/maqi1520/react-antd-low-code)
- 📗 预览地址: [low-code.runjs.cool](https://low-code.runjs.cool/)

## 小结

本地记录一个简易低代码的实现方式，简单概括为 `拖拽` -> `JSON Tree`——> `页面`

但想要真正生产可用还有很长的路要走，比如

- 组件数据绑定和联动
- 随着组件数量的增加需要将组件服务化，动态部署等
- 组件开发者的成本与维护者的上手成本权衡
- 组件模板化
- 页面部署投产等

以上任意一点都可能投入较高的成本，个人认为目前低代码，成本比较低且可以投产的方式有

1、类似 [mall-cook](https://github.com/wangyuan389/mall-cook) H5 搭建

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/87b2e18d4d9049d88a03c1c2ddfcea55~tplv-k3u1fbpfcp-watermark.image?)

2、类似 [json-editor](https://github.com/json-editor/json-editor) 表单搭建

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9ef10b919a5140df9e31ddff3b3389c6~tplv-k3u1fbpfcp-watermark.image?)

全文结束, 本文对低代码搭建的思考和讨论可能还不够完整, 欢迎讨论和补充.
希望这篇文章对大家有所帮助，也可以参考我往期的文章或者在评论区交流你的想法和心得，欢迎一起探索前端。
