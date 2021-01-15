const createRouter = require('./service/generator-route')
const { get } = require('lodash')

const defaultOptions = {
  // views/biz-*/pages
  routeMatchPath: 'views',
  fileSavePath: './src/router/route.config.js'
}

module.exports = (api, vueConfigOptions) => {
  // const { serve, build } = api.service.commands
  api.registerCommand(
    'primary',
    {
      description: 'Automatically generate routes configuration based on files starting with biz-* in the pages folder',
      usage: 'vue-cli-service primary'
    },
    () => {
      let options = get(vueConfigOptions, 'pluginOptions.primary', null)
      if (options && Object.prototype.toString.call(options) === '[object Object]') {
        options = { ...defaultOptions, ...options }
      } else {
        options = defaultOptions 
      }
      createRouter.createRouter(options)
    }
  )
}
