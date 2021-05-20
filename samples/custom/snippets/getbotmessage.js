module.exports = async (container, browser, element, html) => {
  const botMsg = { sender: 'bot', sourceData: { html } }
  botMsg.messageText = await element.getText()
  console.log('getbotmessage got text: ' + botMsg.messageText)
  return container.BotSays(botMsg)
}
