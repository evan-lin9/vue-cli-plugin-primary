# vue-cli-plugin-primary

> 目前这个插件依赖的 vue-cli 4.5x，路由版本为最新的 vue-router 4.x, 仅支持 vue ^3.0.0

按照官方 [vue-cli-plugin](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html) 的规范，实现路由配置的自动生成，具体规则请看使用说明


## 1. 安装

```bash
yarn add vue-cli-plugin-primary

# or 

npm i vue-cli-plugin-primary
```



调用插件

```bash
vue invoke vue-cli-plugin-primary
```



## 2. 配置命令

在 `package.js` 中，增加一条命令

> 为保证开发和构建时，忘记生成新的路由，建议 `dev` 和 `build` 命令一并修改

```javascript
"scripts": {
    "build": "vue-cli-service routes && vue-cli-service build",
    "dev": "vue-cli-service routes && vue-cli-service serve",
    "routes": "vue-cli-service routes"
  },
```



## 3. 使用说明

> 约定式路由也叫文件路由，就是不需要手写配置，文件系统即路由，通过目录和文件及其命名分析出路由配置。[UmiJS](https://umijs.org/zh-CN/docs/convention-routing)

**命令执行成果之后, 会在`src/router` 下生成 routes.js 文件**， 会分析 `src/views/biz-*/pages` 目录拿到路由配置。

需要注意的是，只有满足以下规则的文件才会被注册为路由，

* 以 `biz-` 开头的任意文件下 `pages` 的 .vue 文件 
* 暂不支持以 `.ts` 或 `.js` 结尾的文件

举一个的例子，比如以下文件结构： [也可参考此项目](https://github.com/SkyLin0909/vue3-admin-system)

```bash
.
  └── views
    └── biz-user
    	├── api
    	├── components
    	└── pages
    		├── info.vue
      	└── list.vue
    └── home.vue
    └── login.vue
```

会生成路由配置，

```bash
[
  { path: '/user/info', component: '@/views/biz-user/pages/info' },
  { path: '/user/list', component: '@/views/biz-user/pages/list' },
];
```

#### 动态路由

约定 `[]` 包裹的文件或文件夹为动态路由。

比如：

* `src/views/biz-user/pages/[id].vue 会成为  `  /users/:id`
* `src/views/biz-user/pages/[id]/settings.vue 会成为 ` /users/:id/settings`



#### 动态可选路由

约定 `[ $]` 包裹的文件或文件夹为动态可选路由。

比如：

* `src/views/biz-user/pages/[id$].vue 会成为 `/users/:id?`
* `src/views/biz-user/pages/[id$]/settings.vue` 会成为 `/users/:id?/settings`

举一个 `views` 下的完整的例子，

```bash
.
├── Home.vue
├── Login.vue
├── biz-officer
│   ├── api
│   │   └── index.js
│   ├── components
│   │   └── CardList
│   │       └── index.vue
│   ├── composables
│   │   └── useOfficerRepositories.js
│   └── pages
│       ├── officer-category
│       │   └── index.vue
│       └── officer-list
│           └── index.vue
└── biz-product
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
    path: "/officer/officer-category/index",
    component: () => import('@/views/biz-officer/pages/officer-category')
  },
  {
    path: "/officer/officer-list/index",
    component: () => import('@/views/biz-officer/pages/officer-list')
  },
  {
    path: "/product/:product-price?/index",
    component: () => import('@/views/biz-product/pages/[product-price$]')
  },
  {
    path: "/product/:product-setting/coupon",
    component: () => import('@/views/biz-product/pages/[product-setting]/coupon')
  },
  {
    path: "/product/:product-setting/ship",
    component: () => import('@/views/biz-product/pages/[product-setting]/ship')
  },
  {
    path: "/product/product-category/:index",
    component: () => import('@/views/biz-product/pages/product-category/[index]')
  },
  {
    path: "/product/product-list/:index?",
    component: () => import('@/views/biz-product/pages/product-list/[index$]')
  }
];
```



## **【Feature功能】**

- [ ] 支持TS
- [x] 发布
- [x] 扩展路由属性 `name` 和 `meta`
- [ ] 完善文档与单元测试
- [ ] 支持传入约定路由的根路径与解析规则

