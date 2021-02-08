const Glob = require('glob');
const pify = require('pify');
const path = require('path');
const { mkdir, readFileSync, writeFile } = require('fs');
const glob = pify(Glob);
const { parse } = require('@vue/compiler-sfc')
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// 考虑多种情况：
// 可能是目录，没有后缀，比如 :user/index.vue
// 可能是文件，有后缀，比如 :index.vue
// 由于可选路由采用 ? 的形式，会导致 import 导入文件的路径无法正确解析 :id? 且场景有限，故暂不支持
const RE_DYNAMIC_ROUTE = /^\[(.+?)\]/;
const META_SUPPORT_TYPE = ['StringLiteral', 'NumericLiteral', 'BooleanLiteral']
// const EXTEND_ATTRIBUTES = ['name', 'layout', 'meta']

// 根据配置获取约定的路由文件
const generateRoutesAndFiles = async (matchPath) => {
  const files = {};

  (await glob(
    `${matchPath}/**/*.{vue,js}`,
    {
      cwd: path.resolve(process.cwd(), './src'),
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/{api,hooks,components}/**/*',
        '.*',
        '_*'
      ]
    })
  ).forEach(file => {
    const key = file.replace(/\.(js|vue)$/, '')
    if (/\.vue$/.test(file) || !files[key]) {
      files[key] = file.replace(/(['"])/g, '\\$1')
    }
  });

  return createRoutes(
    Object.values(files),
    'views'
  )
}

const createRoutes = (files, pagesDir) => {
  const routes = [];

  files.forEach((file) => {
    const paths = file
      .replace(RegExp(`^${pagesDir}`), '')
      .replace(/\.(vue|js)$/, '')
      .replace(/\/{2,}/g, '/')
      .split('/')
      .slice(1);
    const route = {
      path: '',
      component: file,
    };
    const path = paths.map(p => {
      // dynamic route
      p = p.replace(RE_DYNAMIC_ROUTE, ':$1')
      // 后续考虑用 [] 表示可选路由
      // :id$ => :id?
      // if (p.endsWith('$')) {
      //   p = p.slice(0, -1) + '?'
      // }
      return p
    })
    .join('/');
    route.path = `/${path}`;
    routes.push(route)
  });

  return normalizeRoutes(routes)
}

// 处理扩展路由属性（meta）
function normalizeMetaInfo(nodes) {
  const meta = {}
  nodes.forEach(node => {
    const { key, value } = node
    if (~META_SUPPORT_TYPE.indexOf(value.type)) {
      meta[key.name] = value.value
    }
  })
  return meta
}

// 美化以 /index 结尾的 path
function normalizePath(path) {
  if (path.endsWith('/index')) {
    return path.replace(/\/index$/, '')
  }
  return path
}

// 核心逻辑，生成符合 vue-router4 风格的路由文件
function normalizeRoute(route) {
  let props;
 
  if (route.component) {
    try {
      // 基于 babel 拿到到 AST，从 script 标签内容中取出 name、meta、layout
      const source = readFileSync(`src/${route.component}`, 'utf-8');
      const parsed = parse(source).descriptor

      if (parsed.script && parsed.script.content) {
        const code = parsed.script.content
        const ast = parser.parse(code, { sourceType: 'module' })
        const visitor = {
          ExportDefaultDeclaration(path) {
            const {
              declaration: { properties }
            } = path.node;
            let len = properties.length;
            let index = -1;

            while (index < len) {
              const result = properties[++index]
              if (result && result.type === 'ObjectProperty') {
                const { key, value } = result
                if (value.type === 'StringLiteral' || value.type === 'NullLiteral') {
                  if (key.name === 'name' || key.name === 'layout') {
                    // 如果为 NullLiteral 类型时，这里的 value.value 其实为 undefiend
                    route[key.name] = value.type === 'NullLiteral' ? null : value.value
                  }
                } else if (key.name === 'meta' && value.type === 'ObjectExpression') {
                  // 只处理对象的第一层，暂不支持递归处理
                  route.meta = normalizeMetaInfo(value.properties)
                }
              }
            }
          }
        };

        traverse(ast, visitor)
      }
    } catch (e) {
      throw new Error(
        `Parse conventional route component ${route.component} failed, ${e.message}`,
      );
    }
    if (route.component.endsWith('.vue')) {
      // user.vue => user
      route.component = route.component.slice(0, -4)
    }
    if (route.component.endsWith('/index')) {
      // user/index => user
      route.component = route.component.slice(0, -6)
    }
    route.component = `() => import('@/${route.component}')`
  }

  return {
    ...route,
    ...(typeof props === 'object' ? props : {}),
  };
}

function normalizeRoutes(routes) {
  const result = routes
    .map(i => normalizeRoute(i))
    .map(v => ({ ...v, path: normalizePath(v.path)}))
  const routerConfig = [
    {
      path: '',
      component: 'Layout',
      children: [],
    }
  ]
  // 处理路由布局
  const layouts = [
    'Layout'
  ]
  result.forEach(route => {
    const { layout } = route

    if (layout === null) {
      // 不需要布局路由
      routerConfig.push(route)
    } else if (layout) {
      let index = routerConfig.findIndex(i => i.component === layout)
      if (index === -1) {
        layouts.push(layout)
        index = routerConfig.push({
          path: '',
          component: layout,
          children: []
        }) - 1
      }
      routerConfig[index].children.push(route)
    } else {
      // 使用默认布局
      routerConfig[0].children.push(route)
    }

    Reflect.deleteProperty(route, 'layout')
  })
  return { routerConfig, layouts }
}

// 生成路由导入的语法
function generateImportLayouts(layouts) {
  let importTemplate = ''
  if (layouts.length) {
    layouts.forEach(layout => {
      if (layout === 'Layout') {
        importTemplate += `import Layout from "@/layouts";` + '\n'
      } else {
        importTemplate += `import ${layout} from "@/layouts/${layout}";` + '\n'
      }
    })
    return importTemplate
  }
  return
}

module.exports.createRouter = (options, flag = false) => {
  if (flag) return
  generateRoutesAndFiles(options.routeMatchPath).then(({routerConfig, layouts}) => {
    const string = generateImportLayouts(layouts) + '\n' + `export default ${JSON.stringify(routerConfig, null, 2)};`
      .replace(/"component": "(\w+?)"/g, `"component": $1`)
      .replace(/"(\w+?)":/g, '$1:')
      .replace(/"\(\)/g, "()")
      .replace(/'\)"/g, "')");

    mkdir(path.resolve(process.cwd(), './src/router'), err => {
      if (err) {
        console.log('routes file already exists')
      }
    })
    writeFile(path.resolve(process.cwd(), `${options.fileSavePath}`), string, () => {
      console.log('routes generated')
    })
  })
}
