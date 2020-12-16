const createRouter = require('./service/generator-route')

module.exports = (api) => {
  // const { serve, build } = api.service.commands
  api.registerCommand(
    'routes',
    {
      description: 'Automatically generate routes configuration based on files starting with biz-* in the pages folder',
      usage: 'vue-cli-service routes'
    },
    () => {
      createRouter.createRouter(false)
    }
  )
}
