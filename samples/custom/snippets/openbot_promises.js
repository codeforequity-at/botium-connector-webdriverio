module.exports = (container, browser) => {
  return browser.$('#onetrust-accept-btn-handler')
    .then(ccBtn => ccBtn.waitForClickable({ timeout: 20000 }).then(() => ccBtn.click()))
    .then(() => browser.$('.troy__start-icon'))
    .then(startChat => startChat.waitForClickable({ timeout: 20000 }).then(() => startChat.click()))
}
