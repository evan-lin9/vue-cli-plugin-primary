const Glob = require('glob');
const pify = require('pify');
const path = require('path');
const { mkdir, readFileSync, writeFile } = require('fs');
const glob = pify(Glob);
const { parse } = require('@vue/compiler-sfc')
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// 考虑多种情况：
// 可能是目录，没有后缀，比如 [post]/index.vue
// 可能是文件，有后缀，比如 [index].vue
// [id$] 是可选动态路由
const RE_DYNAMIC_ROUTE = /^\[(.+?)\]/;
const META_SUPPORT_TYPE = ['StringLiteral', 'NumericLiteral', 'BooleanLiteral']

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
      // :id$ => :id?
      if (p.endsWith('$')) {
        p = p.slice(0, -1) + '?'
      }
      return p
    })
    .join('/');
    route.path = `/${path}`;
    routes.push(route)
  });

  return normalizeRoutes(routes)
}

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

function normalizePath(path) {
  if (path.endsWith('index')) {
    return path.replace(/index$/, '')
  }
  return path
}

function normalizeRoute(route) {
  let props;
 
  if (route.component) {
    try {
      // 基于 babel 拿到到 AST，从 script 标签内容中取出 name 和 meta
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
            let target = 0; // 用于标记 name 和 meta 属性已经处理完毕

            while (len-- && target !== 2) {
              const { key, value } = properties[++index];
              if (key.name === 'name' && value.type === 'StringLiteral') {
                target++
                route.name = value.value
              } else if (key.name === 'meta' && value.type === 'ObjectExpression') {
                target++
                // 只处理对象的第一层，暂不支持递归处理
                route.meta = normalizeMetaInfo(value.properties)
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
  return routes
    .map(i => normalizeRoute(i))
    .map(v => ({ ...v, path: normalizePath(v.path)}))
}

module.exports.createRouter = (options, flag = false) => {
  if (flag) return
  generateRoutesAndFiles(options.routeMatchPath).then(res => {
    const string = `export default ${JSON.stringify(res, null, 2)};`
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
