module.exports = (container, browser) => {
  return browser
    .waitForVisible('.cc-btn', 20000).then(() => console.log('cc-btn visible'))
    .click('.cc-btn')
    .pause(2000)
    .waitForVisible('#StartChat', 20000).then(() => console.log('troy button visible'))
    .click('#StartChat')
    .waitForVisible('#chat', 10000).then(() => console.log('troy window visible'))
    .waitForVisible('#textInput', 10000).then(() => console.log('troy textInput visible'))
    .waitForVisible('.from-watson', 10000).then(() => console.log('troy welcome visible'))
}
