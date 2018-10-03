const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()
  .setCapability('WEBDRIVERIO_IGNOREWELCOMEMESSAGES', 1)

driver.BuildFluent()
  .Start()
  .UserSaysText('Essential Account')
  .WaitBotSays(console.log.bind(null, 'BOT SAYS: '))
  .UserSaysText('How to open an account ?')
  .WaitBotSays(console.log.bind(null, 'BOT SAYS: '))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
