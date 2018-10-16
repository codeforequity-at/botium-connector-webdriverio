const url = require('url')
const mime = require('mime-types')
const debug = require('debug')('botium-connector-webdriverio-messenger_com')

const cleanCssImageUrl = (cssImageUrl) => {
  if (cssImageUrl.startsWith('url')) {
    cssImageUrl = cssImageUrl.substr(5, cssImageUrl.length - 7)
  }
  const myUrl = url.parse(cssImageUrl, true)
  return myUrl.query.url || cssImageUrl
}

module.exports = {
  'WEBDRIVERIO_OPENBOT': (container, browser) => {
    return browser
      .waitForVisible('#email', 20000)
      .waitForVisible('#pass', 20000)
      .waitForVisible('#loginbutton', 20000)
      .then(() => debug('facebook login form fully visible'))
      .setValue('#email', container.caps['WEBDRIVERIO_USERNAME'])
      .setValue('#pass', container.caps['WEBDRIVERIO_PASSWORD'])
      .click('#loginbutton')
      .waitForVisible('._4_j4', 20000)
      .waitForVisible('div._o46', 20000)
      .then(() => debug('facebook messenger fully visible'))
      .catch((err) => { throw new Error(`WEBDRIVERIO_OPENBOT/messenger_com opening facebook messenger failed: ${err}`) })
  },
  'WEBDRIVERIO_SENDTOBOT': (container, browser, msg) => {
    if (msg.sourceData) {
      if (msg.sourceData.quickReply) {
        const qrSelector = 'div._10-e*=' + msg.sourceData.quickReply
        return browser
          .waitForVisible(qrSelector, 20000)
          .click(qrSelector)
      }
    } else if (msg.messageText) {
      return browser.elementActive().then((r) => {
        const activeElement = r.value && (r.value.ELEMENT || r.value['element-6066-11e4-a52e-4f735466cecf'])
        if (activeElement) {
          let inputElementCount = 0
          return browser
            .elements('div._o46._3i_m')
            .then((r) => { inputElementCount = r.value.length })
            .elementIdValue(activeElement, msg.messageText)
            .elementIdValue(activeElement, 'Enter')
            .elements('div._o46._3i_m')
            .waitUntil(() => browser.elements('div._o46._3i_m').then((r) => r.value.length > inputElementCount), 10000)
            .then(() => debug('input element visible, continuing'))
            .catch((err) => { throw new Error(`WEBDRIVERIO_SENDTOBOT/messenger_com input failed ${err}`) })
        } else {
           throw new Error('WEBDRIVERIO_SENDTOBOT/messenger_com no active element found, input not possible')
        }
      })
    }
  },
  'WEBDRIVERIO_OUTPUT_ELEMENT': 'div._o46.text_align_ltr:not(._3i_m)',
  'WEBDRIVERIO_IGNOREUPFRONTMESSAGES': true,
  'WEBDRIVERIO_OPENBOTPAUSE': 5000,
  'WEBDRIVERIO_GETBOTMESSAGE': (container, browser, elementId) => {
    debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com receiving output for element ${elementId}`)

    const botMsg = { sender: 'bot', buttons: [], cards: [], media: [] }

    browser.elements('div._2zgz')
      .then((buttonElements) => {
        return buttonElements.value && Promise.all(buttonElements.value.map(buttonElement =>
          browser.elementIdText(buttonElement.ELEMENT)
            .then((buttonText) => {
              botMsg.buttons.push({ text: buttonText.value })
            })
            .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com error getting button text: ${err}`))
        ))
      })
      .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com error getting button texts: ${err}`))
      .elementIdElement(elementId, 'div._3cn0')
      .then((cardElement) => {
        if (cardElement.value) {
          botMsg.cards.push({ buttons: [] })
          return browser.elementIdElement(cardElement.value.ELEMENT, 'div._4y9n')
            .then((imgElement) => imgElement.value && browser.elementIdCssProperty(imgElement.value.ELEMENT, 'background-image'))
            .then((imgBackground) => {
              if (imgBackground && imgBackground.value) {
                const imgUrl = cleanCssImageUrl(imgBackground.value)
                botMsg.cards[0].image = {
                  mediaUri: imgUrl,
                  mimeType: mime.lookup(imgUrl) || 'application/unknown'
                }
              }
            })
            .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com card has no background picture: ${err}`))
            .then(() => browser.elementIdElement(cardElement.value.ELEMENT, 'div._3cne'))
            .then((textElement) => textElement.value && browser.elementIdText(textElement.value.ELEMENT))
            .then((cardText) => {
              if (cardText && cardText.value) {
                botMsg.cards[0].text = cardText.value
              }
            })
            .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com card has no text: ${err}`))
            .then(() => browser.elementIdElements(cardElement.value.ELEMENT, 'a._3cnp'))
            .then((buttonElements) => {
              return buttonElements.value && Promise.all(buttonElements.value.map(buttonElement =>
                browser.elementIdText(buttonElement.ELEMENT)
                  .then((buttonText) => {
                    botMsg.cards[0].buttons.push({ text: buttonText.value })
                  })
                  .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com error getting card button text: ${err}`))
              ))
            })
            .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com card has no buttons: ${err}`))
        }
      })
      .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com error getting card: ${err}`))
      .elementIdElement(elementId, 'div._4tsk')
      .then((imgElement) => {
        if (imgElement.value) {
          return browser.elementIdCssProperty(imgElement.value.ELEMENT, 'background-image')
            .then((imgBackground) => {
              if (imgBackground && imgBackground.value) {
                const imgUrl = cleanCssImageUrl(imgBackground.value)
                botMsg.media.push({
                  mediaUri: imgUrl,
                  mimeType: mime.lookup(imgUrl) || 'application/unknown'
                })
              }
            })
            .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com card has no background picture: ${err}`))
        }
      })
      .catch((err) => debug(`WEBDRIVERIO_GETBOTMESSAGE/messenger_com error getting image: ${err}`))
      .elementIdText(elementId).then((elementValue) => {
        botMsg.sourceData = { elementValue, elementId }
        botMsg.messageText = elementValue.value
        container.BotSays(botMsg)
      })
  }
}
