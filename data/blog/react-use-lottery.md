---
title: '年会没中奖，老板买了一个抽奖程序'
date: 2026-03-16 13:39:37
lastmod: 2026-03-15 21:22:18 +0800
tags: [前端, React.js]
draft: false
summary: '老板买了一个抽奖程序，我使用 react 来实现一版与公司年会一模一样的功能，并且还可以设置内定名额。'
images:
  [
    'https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1426945aef024f40a5077e47cbd042c4~tplv-k3u1fbpfcp-watermark.image?',
  ]
authors: ['default']
layout: PostLayout
---

PK 创意闹新春，我正在参加「春节创意投稿大赛」，详情请看：[春节创意投稿大赛](https://juejin.cn/post/7049181546682515464)

## 前言

昨天参加了公司年会，显然我啥奖项都没中，什么“优秀员工”都跟我们前端工程师无关，不然我不会在这里写文了，等等，这里为什么要用“我们”，[疑问.jpg]，前端工程师应该是评不到“优秀员工”的，[打脸.png]，如果有小伙伴获得，欢迎在评论区分享，《前端工程师如何入选优秀员工？》

先说下今年公司的奖项

- 一等奖 iPhone13 10 名
- 二等奖 Apple Watch 30 名
- 三等级 AirPos 50 名
  没有特等奖，感觉中奖率还蛮高的，那么有多少人参加呢？有 700 人？怎么有那么多人，[疑问.jpg]，我怎么记得公司只有 350 人左右，2021 招了这么多人吗？然后呢，这个抽奖程序是买的，大概花了 5000+ 具体不记得了，我在想这个程序给内部开发不好吗？好用得着买？算了，不纠结了，一起来看下抽奖程序怎么实现的吧!

## 抽奖程序

![123.gif.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/594397c397484e3c81610ef3680c8aca~tplv-k3u1fbpfcp-watermark.image?)

领导说开始就滚动屏幕，领导喊停就停，就这么个抽奖形式，大家都懂的。

## 奖品数据 JSON

先定义一个 JSON 描述下奖品情况吧

```json
[
  {
    name: "一等奖",
    count: 10,
    img: "https://img13.360buyimg.com/cms/jfs/t1/208697/10/617/143853/61413ae6E577772f8/fc01a7a528f9c531.png",
    time: 10,
  },
  {
    name: "二等奖",
    count: 30,
    img: "https://img11.360buyimg.com/cms/jfs/t1/203838/28/10178/146961/615ff266E8c0f9045/78bfc03faf8b1e2d.png",
    time: 5,
  },
  {
    name: "三等奖",
    count: 50,
    img: "https://img13.360buyimg.com/cms/jfs/t1/85541/32/9875/160522/5e12bfe2Ed83e51f5/934dbc9de37038f2.png",
    time: 5,
  },
];
```

time 是抽奖次数， count 是奖品数量

## 模拟用户

这里使用大名鼎鼎的 faker.js 目前已经由社区维护了， 首先要安装包

```bash
npm install @faker-js/faker -D
```

生成 700 名用户

```js
import faker from '@faker-js/faker'
faker.setLocale('zh_CN')

const users = new Array(700).fill(null).map((item, index) => ({
  id: index + 1,
  name: faker.name.lastName() + faker.name.firstName(),
}))
```

id 要唯一，因为可能存在同名的情况

## JS 实现抽奖

也就是要从一个用户列表中随机出几个用户

```js
const randomCountUser = (list, count) => {
  let shows = []
  for (let index = 0; index < count; index++) {
    const random = Math.floor(Math.random() * list.length)
    shows.push(list[random])
    list[random] = list[list.length - 1]
    list.length--
  }
  return shows
}
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/453436d8be82457ba48f39cb696ce358~tplv-k3u1fbpfcp-watermark.image?)

- 为什么不选择用`splice`？

  - 大多数人一开始想法都会是`splice`，这是个很正确也很直观的理解。但是要注意`splice`是性能消耗很大的操作，如果抽奖池量级一大就会明显影响性能了

- 为什么给`list[random]`赋值，然后长度减一？
  - 我们需要把中奖的用户剥离出去，然后把数组末尾的用户填进来，最后把整个数组的长度减一，这样下一轮遍历的时候，就是个全新的数组，而且对整个数组的改动是最小的，性能消耗最小.

## React 实现

使用 create-react-app 创建一个项目, 并且配置 tailwindcss

```
npx create-react-app my-project
npm install -D tailwindcss postcss autoprefixernpx tailwindcss init -p
```

先定义几个状态

```js
// 当前抽几等奖奖
const [current, setCurrent] = useState(awards.length - 1)
const award = awards[current]
// 是否结束
const [over, setOver] = useState(false)
//  当前抽了几次
const [currentTime, setCurrentTime] = useState(0)
// 是的在进行中
const goingRef = useRef(false)
// 已经中奖用户，拥有用户数据过滤
const [winners, setWinners] = useState([])
//  中奖结果输出
const [result, setResult] = useState({})
// 界面展示用户
const [showUsers, setShowUsers] = useState([])
// 一次抽几个
const currentNumber = award.count / award.time
```

按开始暂停实现

```js
const toggle = () => {
  if (over) {
    return
  }
  if (!goingRef.current) {
    if (award.count > currentWinNumber) {
      const winnerIds = winners.map((w) => w.id)
      let others = winnerIds.length ? users.filter((u) => !winnerIds.includes(u.id)) : users
      goingRef.current = setInterval(() => {
        setShowUsers(randomCountUser(others, currentNumber))
      }, 200)
    } else {
      if (current > 0) {
        setCurrentTime(0)
        setShowUsers([])
        setCurrent(current - 1)
      } else {
        setOver(true)
      }
    }
  } else {
    clearInterval(goingRef.current)
    goingRef.current = false
    setWinners([...winners, ...showUsers])
    setResult((prev) => {
      let sumWinners = prev[award.name] || []
      sumWinners = sumWinners.concat(showUsers)
      return {
        ...prev,
        [award.name]: sumWinners,
      }
    })
    setCurrentTime(currentTime + 1)
  }
}
```

## 使用 tailwind CSS

使用 `grid` 布局 `place-items-stretch` 这个 class 可以让子元素铺满整个区域

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fd7810dd995b48f18fab03431b6853ce~tplv-k3u1fbpfcp-watermark.image?)

## 总结

这就总结了，这么快吗？ 还没到 100 行代码，老板买的抽奖程序，就这么简单吗？是否有内定名额？，好吧，那我们来在增加一个内定名额吧

## 如何 100%中奖,

增加内定参数

```js
const suerData = {
  一等奖: [701, 702],
}
```

701 和 702 是我后面增加的 2 个用户，后面我希望这 2 个用户获得一等奖

## 自定义 hooks

其实抽奖的核心都是随机数，我们只需要定义入参和出参，抽奖过程中的参数我们不关心，
所有我们可以抽取出一个自定义 hook。

输入

- users 所有用户
- awards 所有奖项
- sureData 内定名额

输出

- toggle 开始或停止
- award 当前抽的奖项
- showUsers 显示的用户
- result 中奖结果

```js
const reducer = (state, payload) => ({ ...state, ...payload })

function useLottery(users, awards, sureData = {}) {
  // 是的在进行中
  const goingRef = useRef(false)
  const [state, setState] = useReducer(reducer, {
    current: awards.length - 1,
    over: false, //是否结束
    currentTime: 0, //  当前抽了几次
    winners: [], // 已经中奖用户，拥有用户数据过滤
    result: [], //  中奖结果输出
    showUsers: [], // 界面展示用户
    sure: sureData,
  })

  const { current, over, currentTime, winners, result, showUsers, sure } = state

  // 当前抽几等奖奖
  const award = awards[current]

  // 一次抽几个
  const currentNumber = award.count / award.time
  //currentWinNumber
  const currentWinNumber = currentTime * currentNumber

  const toggle = () => {
    if (over) {
      return
    }
    if (!goingRef.current) {
      if (award.count > currentWinNumber) {
        const winnerIds = winners.map((w) => w.id)
        let others = winnerIds.length ? users.filter((u) => !winnerIds.includes(u.id)) : users
        goingRef.current = setInterval(() => {
          setState({
            showUsers: randomCountUser(others, currentNumber),
          })
        }, 200)
      } else {
        if (current > 0) {
          setState({
            currentTime: 0,
            showUsers: [],
            current: current - 1,
          })
        } else {
          setState({
            over: true,
          })
        }
      }
    } else {
      clearInterval(goingRef.current)
      goingRef.current = false
      // 最终显示用户，为了可以直接修改
      let finailyShowUsers = showUsers
      let finailySureData = { ...sure }
      // 如果有内定名额逻辑
      if (Array.isArray(sure[award.name])) {
        finailyShowUsers = showUsers.map((p, index) => {
          let sureUser
          sureUser = sure[award.name][index]
            ? users.find((u) => u.id === sure[award.name][index])
            : undefined
          if (sureUser) {
            finailySureData[award.name] = sure[award.name].filter((id) => id !== sureUser.id)
            return sureUser
          } else {
            return p
          }
        })
      }
      let sumWinners = result[award.name] || []
      sumWinners = sumWinners.concat(finailyShowUsers)

      setState({
        winners: [...winners, ...finailyShowUsers],
        showUsers: finailyShowUsers,
        currentTime: currentTime + 1,
        sure: finailySureData,
        result: {
          ...result,
          [award.name]: sumWinners,
        },
      })
    }
  }

  return {
    toggle,
    result,
    award,
    showUsers,
  }
}
```

## 测试

使用 hooks

```
const { toggle, award, showUsers, result } = useLottery(users, awards, {
    三等奖: [701, 702],
  });
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/39732934658b493b9c6492fd6c544f6e~tplv-k3u1fbpfcp-watermark.image?)

## 发布 npm 包

当然这个 hook 我们可以发布一个 npm 包，未来说不定会开发移动端的抽奖页面，我们可以公用这个抽奖逻辑，只需要重新写视图部分就好了
在发包之前，还需要对这个 hook 进行测试，这里我使用 @testing-library/react-hooks，在这里就不展开叙述了，先预留一篇文章《如何测试 react hooks？》

## 最后

通过本文我学会了

1. 发布一个 react hooks npm 包
2. 使用 github action 自动发布 npm 包
3. 使用 github pages 部署预览页面
4. 所有的抽奖程序都是随机数
5. 是程序就可能会有内定名额

抽奖程序 plus（附加内定名额） 我也**免费赠送**给大家，希望各位喜欢。

- 体验地址：https://maqi1520.github.io/react-use-lottery/
- npm: https://www.npmjs.com/package/@maqibin/react-use-lottery
- github: https://github.com/maqi1520/react-use-lottery

全文结束, 记得点赞 👍🏻.
希望这篇文章对大家有所帮助，也可以参考我往期的文章或者在评论区交流你的想法和心得，欢迎一起探索前端。
