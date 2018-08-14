const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()
  .setCapability('WEBDRIVERIO_URL', 'https://www.messenger.com/t/1919178811662091')

driver.BuildFluent()
  .Start()
  .UserSaysText('Harry Potter')
  .WaitBotSaysText(console.log)
  .UserSays({ sourceData: { quickReply: 'Ja' }})
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
