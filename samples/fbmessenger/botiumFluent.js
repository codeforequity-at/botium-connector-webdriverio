const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()
  .setCapability('WEBDRIVERIO_URL', 'https://www.messenger.com/t/1271293572983985')

driver.BuildFluent()
  .Start()
  .UserSaysText('cancel')
  .UserSaysText('start')
  .WaitBotSaysText(console.log)
  .WaitBotSaysText(console.log)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
