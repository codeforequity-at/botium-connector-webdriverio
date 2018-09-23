const BotDriver = require('botium-core').BotDriver

process.env.BOTIUM_CONFIG = process.env.BOTIUM_CONFIG || './botium-local-json'

const driver = new BotDriver()

driver.BuildFluent()
  .Start()
  .UserSaysText('Hello')
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
