const BotDriver = require('botium-core').BotDriver

process.env.BOTIUM_CONFIG = process.env.BOTIUM_CONFIG || './botium-local.json'

const driver = new BotDriver()
driver.on('MESSAGE_ATTACHMENT', (container, attachment) => {
  console.log('Attachment Base64 Length: ' + attachment.base64.length)
  const buf = Buffer.from(attachment.base64, 'base64')
  require('fs').writeFileSync('./screenshot.png', buf)
})
driver.on('CONTAINER_STARTED', (container, context) => {
  console.log('CONTAINER_STARTED ' + JSON.stringify(context));
})

driver.BuildFluent()
  .Start()
  .UserSaysText('Hello')
  .WaitBotSays((msg) => {
    console.log(msg)
    if (msg.attachments) {
      console.log('Attachment Base64 Length: ' + msg.attachments[0].base64.length)
      const buf = Buffer.from(msg.attachments[0].base64, 'base64')
      require('fs').writeFileSync('./screenshot.png', buf)
    }
  })
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
