module.exports = async (container, browser) => {
  const ccBtn = await browser.$('#onetrust-accept-btn-handler')
  await ccBtn.waitForClickable({ timeout: 20000 })
  await ccBtn.click()

  const startChat = await browser.$('.troy__start-icon')
  await startChat.waitForClickable({ timeout: 20000 })
  await startChat.click()
}
