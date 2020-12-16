# vue-cli-plugin-umijs

按照官方  [vue-cli-plugin](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html) 文档的规范，并基于 [Nuxt.js](https://zh.nuxtjs.org/) 源码实现路由配置的自动生成，并存在 `src/router/routes` 中



> 目前这个插件依赖的 vue-cli 4.5x，路由版本为最新的 vue-router 4.x



## 1. 安装

```bash
yarn add vue-cli-plugin-umijs

# or 

npm i vue-cli-plugin-umijs
```



调用插件

```bash
vue invoke vue-cli-plugin-umijs
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



## 3. 使用

