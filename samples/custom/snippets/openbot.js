module.exports = async (container, browser) => {
  const startChat = await browser.$('.troy__start-icon')
  await startChat.waitForClickable({ timeout: 20000 })
  await startChat.click()
  console.log('troy button visible and clicked')
  await (await browser.$('.troy__chat')).waitForDisplayed(10000)
  console.log('troy window visible')
  await (await browser.$('#textInput')).waitForDisplayed(10000)
  console.log('troy textInput visible')
  await (await browser.$('.from-watson')).waitForDisplayed(10000)
  console.log('troy welcome visible')
}
