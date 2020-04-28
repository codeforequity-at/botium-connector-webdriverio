module.exports = (container, browser) => {
  return browser.$('#StartChat')
    .then(startChat => startChat.waitForClickable(20000).then(() => startChat.click()))
    .then(() => browser.$('#chat').then(c => c.waitForDisplayed(10000)))
    .then(() => browser.$('#textInput').then(t => t.waitForDisplayed(10000)))
    .then(() => browser.$('.from-watson').then(f => f.waitForDisplayed(10000)))
}
