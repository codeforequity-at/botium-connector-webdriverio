const BotDriver = require('botium-core').BotDriver
/*
function start(container, browser) {
  return browser
    .waitForVisible('.cc-compliance', 20000).then(() => console.log('cc-compliance visible'))
    .click('.cc-compliance')
    .pause(2000)
    .waitForVisible('#StartChat', 20000).then(() => console.log('troy button visible'))
    .click('#StartChat')
    .waitForVisible('#chat', 10000).then(() => console.log('troy window visible'))
    .waitForVisible('#textInput', 10000).then(() => console.log('troy textInput visible'))
    .waitForVisible('.from-watson', 10000).then(() => console.log('troy welcome visible'))
}
*/
/*
const start = `
  result = browser
    .waitForVisible('.cc-btn', 20000).then(() => console.log('cc-btn visible'))
    .click('.cc-btn')
    .pause(2000)
    .waitForVisible('#StartChat', 20000).then(() => console.log('troy button visible'))
    .click('#StartChat')
    .waitForVisible('#chat', 10000).then(() => console.log('troy window visible'))
    .waitForVisible('#textInput', 10000).then(() => console.log('troy textInput visible'))
    .waitForVisible('.from-watson', 10000).then(() => console.log('troy welcome visible'))
`
*/

const driver = new BotDriver()
//  .setCapability('WEBDRIVERIO_OPENBOT', start)

driver.BuildFluent()
  .Start()
  .WaitBotSaysText(console.log)
  .UserSaysText('Hallo')
  .WaitBotSaysText(console.log)
  .UserSaysText('Ich möchte kündigen')
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
