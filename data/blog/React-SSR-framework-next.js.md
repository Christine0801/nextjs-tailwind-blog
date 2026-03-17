---
title: 'React 必学SSR框架——next.js'
date: 2026-03-16 13:39:37
lastmod: 2026-03-15 21:22:18 +0800
tags: [React.js, JavaScript]
draft: false
summary: '​ 首先我们就回顾一下，我们到底是怎么告别了使用 php/jsp 做服务器端渲染，进入前后端分离的客户端渲染时代，又为什么重新回到了服务端渲染。'
images: ['']
authors: ['default']
layout: PostLayout
---

首先我们就回顾一下，我们到底是怎么告别了使用 php/jsp 做服务器端渲染，进入前后端分离的客户端渲染时代，又为什么重新回到了服务端渲染。

其实把 next.js/nust.js 称为 SSR（服务器端渲染 Server Side Render）不太精确，应该是 Isomorphic render（同构渲染）。

服务器渲染(Server Side Render)并不是一个复杂的技术，而 `服务器渲染` 与 `服务器同构渲染` 则是 2 个不同的概念，重点在于：**同构**。

- 服务端渲染：渲染过程在服务器端完成，最终的渲染结果 HTML 页面通过 HTTP 协议发送给客户端。对于客户端而言，只是看到了最终的 HTML 页面，看不到数据，也看不到模板。

- 客户端渲染：服务器端把模板和数据发送给客户端，渲染过程在客户端完成。

## 为什么需要同构？

通常同构渲染主要是为了：

- 利于 SEO 搜索引擎收录
- 加快首屏呈现时间
- 同时拥有`单页(SPA)`和`多页路由`的用户体验

前端同构就是：**让一套 javascript 代码同时跑在服务端和客户端**

## 为什么需要现代的前端同构框架？

现代前端框架（react、vue、angular）都有服务端渲染 API，为什么我们还需要一个同构框架？原因是，一个正常的同构需求，我们需要：

1. 前端组件渲染为 HTML 字符串，流
1. 服务端，客户端资源的加载不同处理，(首屏不一定全部加载完所有 js……)
1. 服务端，客户端的状态数据的传递
1. 打包工具链
1. 性能优化
1. ……

而[React SSR 的 API](https://reactjs.org/docs/react-dom-server.html)只有四个函数： `renderToString()`， `renderToStaticMarkup()`，`renderToNodeStream()`，`renderToStaticNodeStream()`（Vue 也类似），只能满足第一个需求，我们需要更多，而以 Next.js 为代表前端同构框架除了能满足上述基本的要求外，还能为我们带来：

1. **极佳的开发体验，做到和开发 SPA 一样**，(是的这个第一重要，不然不如选用传统模版渲染方案)
1. 初次 server 渲染及其高效，所需 JS 也越小越好。
1. 再之后的客户端渲染能够尽可能利用服务端带下来的数据。
1. 便利的 SSG(Static Site Generation)支持。
1. 支持 TypeScript
1. ……

换句话说，**让开发越发动态灵活，让渲染越发静态高效**。
举个例子：

1. Wordpress 等 cms 系统，动态需求容易满足，但是静态缓存的优化就较难实现。
1. Hexo 等方案，页面渲染完全静态化(落地为文件)，但是但凡有点动态化的需求，基本无法实现。

其中[Next.js](https://nextjs.org/)可以说是前端同构中的开山，翘楚级框架，依赖[React](https://reactjs.org/)渲染组件。当然 Vue 有[Nuxt.js](https://nuxtjs.org/)，Angular 有 [Angular Universal](https://github.com/angular/universal)。
![image.png](//p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9f3aa0fc60e94abbab98e9f2e18e6c7a~tplv-k3u1fbpfcp-zoom-1.image)
正式开始之前，强烈推荐 Next.js 的[官方文档](https://nextjs.org/)，挺清晰易懂。
Next.js 的[官方 Blog](https://nextjs.org/blog)，也十分推荐，各个版本的更新详尽及时，堪称模范。
[官方 github](https://github.com/vercel/next.js)也有近百个案例，大家尽可以跟着官方文档一步步学习，也可以很快学会。

本文将以 blog 系统为例，不涉及原理，记录开发过程。

## 创建项目

```shell
yarn create next-app next-start
cd next-start
yarn dev
```

这个时候访问[http://localhost:3000](http://localhost:3000)，我的 next 项目就已经创建成功了，第一步创建项目的时候会比较慢 可以先将 npm 镜像源设置为淘宝的 npm 源

```shell
npm config set registry https://registry.npm.taobao.org
```

### typescript

如果你想使用 typescript ，可以在根目录执行` tsc --init` 创建 tsconfig.json 文件，这个时候执行`yarn dev`, 就会提示你安装 ts 依赖包

```shell
yarn add --dev typescript @types/react @types/node
```

尝试再次 启动 开发服务器。启动服务器后，Next.js 将：

- 为您填充 tsconfig.json 文件。您也可以自定义此文件。
- 创建 next-env.d.ts 文件，以确保 TypeScript 编译器选择正确 Next.js 类型（types）。

### 基于文件路径的路由

#### 页面

一般前端 web 应用都可以简化为，基于路由的页面和 API 接口两部分。Next 的路由系统基于文件路径自动映射，不需要做中性化的配置。这就是约定大于配置。

一般都约定在根目录`pages`文件夹内：

- `./pages/index.tsx` --> 首页 `/`
- `./pages/admin/index.tsx` --> `/admin`
- `./pages/admin/post.tsx `--> `/admin/post `

默认导出一个 React 的组件，Next 就会帮你默认生成对应路由的页面。

- 你不用关心 head 里面资源如何配置加载
- 可以像 SPA 应用一样，使用 css-in-js，css module，less，sass 等样式`import`方式。

##### 页面间的导航

```javascript
import Link from 'next/link'
function Home() {
  return (
    <ul>
      <li>
        <Link href="/about">
          <a>About Us</a>
        </Link>
      </li>
    </ul>
  )
}

export default Home
```

注意，Link 中最好独立包裹 a 元素。

##### 增加 Head

```jsx
import Head from 'next/head'
function About() {
  return (
    <div>
      <Head>
        <title> Hipo Log - {props.post?.name ?? ''}</title>
      </Head>
      content
    </div>
  )
}
export default About
```

##### Dynamic import 代码拆分

Next 也支持 ES2020 的[dynamic import()语法](https://github.com/tc39/proposal-dynamic-import)，可以拆分代码，或者有些第三方组件依赖浏览器 API 时候精致服务端渲染(`ssr: false`)

```jsx
import dynamic from 'next/dynamic'

const DynamicComponentWithCustomLoading = dynamic(() => import('../components/hello'), {
  loading: () => <p>...</p>,
  ssr: false,
})

function Home() {
  return (
    <div>
      <Header />
      <DynamicComponentWithCustomLoading />
      <p>HOME PAGE is here!</p>
    </div>
  )
}

export default Home
```

**👉 注意：在页面代码要谨慎 import 代码！！**

越多引入，上线访问后加载的 js 就越多，特别是下面钩子函数要注意，不要引入多余代码

### API

API 类型的路由约定在`./pages/api `文件夹内，next 会自动映射为`/api/*`路径的 API

```typescript
import { NextApiRequest, NextApiResponse } from 'next'

export default (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ name: 'John Doe' })
}
```

_请求方法通过 req 中取到。_

如此你就可以很轻松的生成一个 API。

#### 动态路由

正常的应用，都有动态路由，next 中精巧使用文件命名的方式来支持。

- `./pages/post/create.js --> /post/create`
- `./pages/post/[pid].js --> /post/1, /post/abc等，但是不会匹配 /post/create`
- `./pages/post/[...slug].js --> /post/1/2, /post/a/b/c等，但是不会匹配 /post/create, /post/abc`

动态参数可以通过`req.query`对象中获取（`{ pid }`， `{ slug: [ 'a', 'b' ] }`），在页面中可以通过 router hook 获取：

```javascript
import { useRouter } from 'next/router'

function About() {
  const router = useRouter()
  const { bID, pID } = router.query
  return <div>About</div>
}
```

### 页面 SSR 钩子以及 SSG

大部分的应用内容，都不是纯静态的，我们需要数据查询才能渲染那个页面，而这些就需要同构钩子函数来满足，有了这些钩子函数，我们才可以在不同需求下作出极佳体验的 web 应用。

#### `getServerSideProps`（SSR）每次访问时请求数据

页面中`export`一个`async`的`getServerSideProps`方法，next 就会在每次请求时候在服务端调用这个方法。

- 方法只会在服务端运行，每次请求都运行一遍`getServerSideProps`方法
- 如果页面通过浏览器端`Link`组件导航而来，Next 会向服务端发一个请求，然后在服务端运行`getServerSideProps`方法，然后返回 JSON 到浏览器。

**👉`getServerSideProps`方法主要是升级了 9.3 之前的`getInitialProps`方法**

9.3 之前的`getInitialProps`方法有一个很大的缺陷是在浏览器中`req`和`res`对象会是`undefined`。也就是使用它的页面，如果是浏览器渲染你需要在组件内再显示地请求一次。开发体验不太好。
如果没有特殊问题，建议使用`getServerSideProps`替代`getInitialProps`方法。

示例：

```tsx
import { GetServerSideProps, NextPage } from 'next'

interface PostProps {
  list: Post[]
}

const App: NextPage<PostProps> = (props) => {
  return <div></div>
}

export const getServerSideProps: GetServerSideProps<PostProps> = async (context) => {
  const list = await context.req.service.post.getPost(context.params.postID)
  return {
    props: {
      list,
    },
  }
}
export default App
```

#### `getStaticProps`和`getStaticPaths`（SSG）构建时请求数据

所谓的 SSG 也就是静态站点生成，类似像 hexo 或者[gatsbyjs](https://www.gatsbyjs.org/)都是在 build 阶段将页面构建成静态的 html 文件，这样线上直接访问 HTML 文件，性能极高。

Next.js 再 9.0 的时候引入了自动静态优化的功能，也就是如果页面没有使用`getServerSideProps`和`getInitialProps`方法，Next 在 build 阶段会生成 html，以此来提升性能。

但是正如上文说的，一般应用页面都会需要动态的内容，因此自动静态优化局限性很大。

Next 在 9.3 中更近了一步，引入了`getStaticProps`和`getStaticPaths`方法来让开发者指定哪些页面可以做 SSG 优化。

- 使用`getStaticProps`方法在 build 阶段返回页面所需的数据。
- 如果是动态路由的页面，使用`getStaticPaths`方法来返回所有的路由参数，以及是否需要回落机制。

```tsx
export async function getStaticPaths() {
  // Call an external API endpoint to get posts
  const res = await fetch('https://.../posts')
  const posts = await res.json()

  // Get the paths we want to pre-render based on posts
  const paths = posts.map((post) => ({
    params: { id: post.id },
  }))

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: true }
}
export const getStaticProps: GetStaticProps<InitProps> = async ({ params }) => {
  const data = await fetch(`http://.../api/p/${params.bookUUID}/${params.postUUID}`)
  return {
    props: {
      post: data,
    },
  }
}
```

使用非常的简单，需要注意的是：

- `getStaticPaths`方法返回的`fallback`很有用：如果`fallback`是`false`，访问该方法没有返回的路由会 404
- 但是如果不想或者不方便在 build 阶段拿到路由参数，可以设置`fallback`为`true`，Next 在访问 build 中没有的动态路由时候，先浏览器 loading，然后服务端开始 build 该页面的信息，然后再返回浏览器渲染，再次访问该路由该缓存就会生效，很强大！！
- ~~**静态缓存目前没办法很灵活的更新！！**，例如博客内容在 build 或者 fallback 生效之后发生更改，目前没办法很方便的替换缓存。~~

- Next 在 9.5.0 之后`getStaticProps`方法可以[增加`revalidate`的属性](https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration)以此来重新生成缓存，这点就很强大：页面加载仍然很快，页面永不离线，即使重新生成失败，老的还可以访问，而且可以大幅减少数据库，server 的负载。

```jsx
function Blog({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li>{post.title}</li>
      ))}
    </ul>
  )
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in
export async function getStaticProps() {
  const res = await fetch('https://.../posts')
  const posts = await res.json()

  return {
    props: {
      posts,
    },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every second
    revalidate: 1, // In seconds
  }
}

export default Blog
```

#### 如何选择 SSR 还是 SSG？

1. 如果页面内容真动态(例如，来源数据库，且经常变化)， 使用`getServerSideProps`方法的 SSR。
2. 如果是静态页面或者伪动态(例如，来源数据库，但是不变化)，可以酌情使用 SSG。

上面就是 Next.js 中主要的部分了，下面是一些可能用到的自定义配置。

### 自定义 App

用`./pages/_app.tsx`来自定义应用 App，可以配置全局的 css，或者`getServerSideProps`方法来给每个页面添加数据。

```javascript
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
```

### 自定义 Document

用`./pages/_document.tsx`来自定义页面的 Document，可以配置页面 html，head 属性，或者使用[静态 getInitialProps 方法中 renderPage 方法](https://nextjs.org/docs/advanced-features/custom-document#customizing-renderpage)来包括整个 react 应用。

```javascript
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
<Html>`, `<Head />`, `<Main />` 和 `<NextScript />都是必须的。
```

- 上述 app 和 document 中使用`getServerSideProps`或者`getInitialProps`方法让整个应用都无法自动静态优化
- 上述 app 和 document 中在浏览器中不执行，包括 react 的 hooks 或者生命周期函数。

### 自定义构建

Next 自然也可以[自定义构建](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)，根目录使用`next.config.js`来配置 webpack，可以用来支持 less 编译，按需加载，path alias 等。

下面的配置，支持了 Antd design 的自定义样式。

```javascript
const withLess = require('@zeit/next-less')
const fs = require('fs')
const path = require('path')

const rewrites = [
  {
    source: '/page/:path*',
    destination: `/?pageNum=:path*`,
  },
  {
    source: '/post/:id/edit',
    destination: `/create`,
  },
]

const lessToJS = require('less-vars-to-js')
const themeVariables = lessToJS(
  fs.readFileSync(path.resolve(__dirname, './src/styles/antd-custom.less'), 'utf8')
)

if (process.env.NODE_ENV !== 'production') {
  rewrites.push({
    source: '/api/:path*',
    destination: `http://localhost:4000/api/:path*`,
  })
}
module.exports = withLess({
  async rewrites() {
    return rewrites
  },
  lessLoaderOptions: {
    javascriptEnabled: true,
    importLoaders: 1,
    localIdentName: '[local]___[hash:base64:5]',
    modifyVars: themeVariables, // make your antd custom effective
  },
  distDir: 'build',
  target: 'serverless',
})
```

### 自定义服务

Next 也支持 node 启动，以此来和其他框架配合实现更复杂的服务端功能，譬如使用它来绑定数据库 typeorm 等。

```javascript
/ server.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true)
    const { pathname, query } = parsedUrl

    if (pathname === '/a') {
      app.render(req, res, '/b', query)
    } else if (pathname === '/b') {
      app.render(req, res, '/a', query)
    } else {
      handle(req, res, parsedUrl)
    }
  }).listen(3000, err => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })
})
```

## 参考

[Next.js 简明教程](https://zhuanlan.zhihu.com/p/130247139)

[如何评价 Next.js](https://www.zhihu.com/question/52365623/answer/291333025)
