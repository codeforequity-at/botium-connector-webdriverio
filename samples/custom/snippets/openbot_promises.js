module.exports = (container, browser) => {
  return browser.$('.cc-btn')
    .then(ccBtn => ccBtn.waitForDisplayed(20000).then(() => ccBtn.click()))
    .then(() => browser.pause(2000))
    .then(() => browser.$('#StartChat'))
    .then(startChat => startChat.waitForDisplayed(20000).then(() => startChat.click()))
    .then(() => browser.$('#chat').then(c => c.waitForDisplayed(10000)))
    .then(() => browser.$('#textInput').then(t => t.waitForDisplayed(10000)))
    .then(() => browser.$('.from-watson').then(f => f.waitForDisplayed(10000)))
}
