# vue-cli-plugin-primary

> 目前这个插件依赖的 vue-cli 4.5x，路由版本为最新的 vue-router 4.x, 仅支持 vue ^3.0.0

按照官方 [vue-cli-plugin](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html) 的规范，实现路由配置的自动生成，具体规则请看使用说明

![demo](http://qm6xd205h.hd-bkt.clouddn.com/vue-cli-plugin-primary.png)

## 0. 安装

```bash
yarn add vue-cli-plugin-primary

# or 

npm i vue-cli-plugin-primary
```


调用插件

```bash
vue invoke vue-cli-plugin-primary
```


## 1. 配置参数
在 `vue.config.js` 中增加对应差距的配置 `pluginOptions.routes`
```js
module.exports = {
  // 以下配置均为默认值，如果不写也能正常使用
  pluginOptions: {
    primary: {
      // 书写 vue 路由页面的文件夹，也支持 Glob 形式的字符串：https://www.npmjs.com/package/glob
      routeMatchPath: 'views',
      // 路由配置文件生成的后存在的地址
      fileSavePath: './src/router/route.config.js',
      // 是否需要按照层级关系生成目录，如果此项为 true，则需要在 vue 文件显示申明 order (1-2-1)
      generateMenu: false,
      // 以字符串的形式，英文逗号分隔；过滤这些文件夹下的文件
      excludeFolder: 'api, hooks, components, utils, services'
    }
  }
}
```



## 2. 配置命令

在 `package.js` 中，增加一条命令

> 为保证开发和构建时，忘记生成新的路由，建议 `dev` 和 `build` 命令一并修改

```javascript
"scripts": {
    "build": "vue-cli-service primary && vue-cli-service build",
    "dev": "vue-cli-service primary && vue-cli-service serve",
    "primary": "vue-cli-service primary"
  },
```



## 3. 使用说明

> 约定式路由也叫文件路由，就是不需要手写配置，文件系统即路由，通过目录和文件及其命名分析出路由配置。[UmiJS](https://umijs.org/zh-CN/docs/convention-routing)

**命令执行成果之后, 会在`src/router` 下生成 route.config.js 文件**， 会分析 `src/views` 目录拿到路由配置。

需要注意的是，只有满足以下规则的文件才会被注册为路由，

* 以 `viwes` 文件下的任意文的 *.vue 文件 
* `api、hooks、services、components` 文件下的任何文件都会被忽略
* 暂不支持以 `.ts` 或 `.js` 结尾的文件

举一个的例子，比如以下文件结构： [也可参考此项目](https://github.com/SkyLin0909/vue3-admin-system)

```bash
  .
  └── views
    └── user
    	├── api
    	├── components  
      ├── hooks
    	└── pages
    		├── info.vue
      	└── list.vue
    └── home.vue
    └── login.vue
```

会生成路由配置，

```bash
[
  { path: '/user/pages/info', component: '@/views/user/pages/info' },
  { path: '/user/pages/list', component: '@/views/user/pages/list' },
  { path: '/home', component: '@/views/home' },
  { path: '/login', component: '@/views/login' }
];
```

#### 动态路由

约定 `[]` 包裹的文件或文件夹为动态路由。

比如：

* `src/views/user/pages/[id].vue` 会成为  `/user/pages/:id`
* `src/views/user/pages/[id]/settings.vue` 会成为 `/user/pages/:id/settings`



#### 动态可选路由

约定 `[ $]` 包裹的文件或文件夹为动态可选路由。

比如：

* `src/views/user/pages/[id$].vue` 会成为 `/user/pages/:id?`
* `src/views/user/pages/[id$]/settings.vue` 会成为 `/user/pages/:id?/settings`

### 4. 配置 name 和 meta

```js
// biz-officer/pages/officer-category.vue
export default {
	name: 'officerCategory',
  // meta 信息目前支持 string，boolean, number，array 类型, 且 array 的元素只支持基础类型
  meta: {
    title: '首页',
    hide: true,
    order: '1-2-1',
    roles: [11, 2, 30]
  }
}
```

举一个 `views` 下的完整的例子，

```bash
.
├── biz-officer
│   ├── api
│   │   └── index.js
│   ├── components
│   │   └── CardList
│   │       └── index.vue
│   ├── hooks
│   │   └── useOfficerRepositories.js
│   └── pages
│       └── officer-category
│           └── index.vue
├── dashboard.vue
├── login.vue
└── product
    └── pages
        ├── [product-price$]
        │   └── index.vue
        ├── [product-setting]
        │   ├── coupon.vue
        │   └── ship.vue
        ├── product-category
        │   └── [index].vue
        └── product-list
            └── [index$].vue
```

会生成路由配置，

```js
export default [
  {
    path: "/biz-officer/pages/officer-category/",
    component: () => import('@/views/biz-officer/pages/officer-category'),
    meta: {
      title: "首页",
      number: 1,
      hide: true
    },
    name: "OfficerCategory"
  },
  {
    path: "/dashboard",
    component: () => import('@/views/dashboard'),
    name: "Dashboard"
  },
  {
    path: "/login",
    component: () => import('@/views/login'),
    name: "Login"
  },
  {
    path: "/product/pages/:product-price?/",
    component: () => import('@/views/product/pages/[product-price$]')
  },
  {
    path: "/product/pages/:product-setting/coupon",
    component: () => import('@/views/product/pages/[product-setting]/coupon'),
    name: "coupon"
  },
  {
    path: "/product/pages/:product-setting/ship",
    component: () => import('@/views/product/pages/[product-setting]/ship'),
    name: "ship"
  },
  {
    path: "/product/pages/product-category/:",
    component: () => import('@/views/product/pages/product-category/[index]')
  },
  {
    path: "/product/pages/product-list/:index?",
    component: () => import('@/views/product/pages/product-list/[index$]'),
    name: "[index$].vue"
  }
];
```



## **【Feature功能】**

- [ ] 支持TS
- [x] 扩展路由属性 `name` 和 `meta`
- [ ] 支持生成 `menuTree` 层级目录
- [ ] 完善文档与单元测试
- [x] 支持传入约定路由的根路径与解析规则

