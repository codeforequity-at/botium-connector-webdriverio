const { PluginClass } = require('../../index')

const initConnector = ({ caps, ...rest }) => {
  const connector = new PluginClass({
    container: { tempDirectory: './' },
    queueBotSays: jest.fn().mockName('queueBotSays'),
    eventEmitter: { emit: jest.fn().mockName('emit') },
    caps: {
      WEBDRIVERIO_OPTIONS: {},
      WEBDRIVERIO_URL: 'http://test.com',
      ...(caps || {})
    },
    ...(rest || {})
  })
  return connector
}

module.exports = {
  initConnector
}