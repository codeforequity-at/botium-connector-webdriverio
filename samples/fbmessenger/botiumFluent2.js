const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()
  .setCapability('WEBDRIVERIO_URL', 'https://www.messenger.com/t/1266719773438364')

driver.BuildFluent()
  .Start()
  .UserSaysText('hello')
  .WaitBotSays((msg) => console.log(JSON.stringify(msg, null, 2)))
  .WaitBotSays((msg) => console.log(JSON.stringify(msg, null, 2)))
  .WaitBotSays((msg) => console.log(JSON.stringify(msg, null, 2)))
  .WaitBotSays((msg) => console.log(JSON.stringify(msg, null, 2)))
  .Call((fluent) => fluent.container.pluginInstance._saveDebugScreenshot('ready'))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
