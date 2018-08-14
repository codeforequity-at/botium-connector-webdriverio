const debug = require('debug')('botium-connector-webdriverio-messenger_com')

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
  },
  'WEBDRIVERIO_SENDTOBOT': (container, browser, msg) => {
    if (msg.sourceData) {
      if (msg.sourceData.quickReply) {
        const qrSelector = 'div._10-e*=' + msg.sourceData.quickReply
        return browser
          .waitForVisible(qrSelector, 20000)
          .click(qrSelector)
      }
    }
    if (msg.messageText) {
      return browser.elementActive().then((r) => {
        const activeElement = r.value && (r.value.ELEMENT || r.value["element-6066-11e4-a52e-4f735466cecf"])
        if(activeElement){
          return browser
            .elementIdValue(activeElement, msg.messageText)
            .elementIdValue(activeElement, 'Enter')
            .pause(1000)
        }
      })
    }
  },
  'WEBDRIVERIO_OUTPUT_ELEMENT': 'div._o46:not(._3i_m)',
  'WEBDRIVERIO_IGNOREUPFRONTMESSAGES': true
/*  'WEBDRIVERIO_GETBOTMESSAGE': (container, browser, elementId) => {
    return Promise.resolve()
  }*/
}
