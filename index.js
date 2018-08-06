const async = require('async')
const webdriverio = require('webdriverio')
const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio')

const Capabilities = {
  WEBDRIVERIO_OPTIONS: 'WEBDRIVERIO_OPTIONS',
  WEBDRIVERIO_URL: 'WEBDRIVERIO_URL',
  WEBDRIVERIO_OPENBROWSER: 'WEBDRIVERIO_OPENBROWSER',
  WEBDRIVERIO_OPENBOT: 'WEBDRIVERIO_OPENBOT',
  WEBDRIVERIO_SENDTOBOT: 'WEBDRIVERIO_SENDTOBOT',
  WEBDRIVERIO_RECEIVEFROMBOT: 'WEBDRIVERIO_RECEIVEFROMBOT',
  WEBDRIVERIO_INPUT_ELEMENT: 'WEBDRIVERIO_INPUT_ELEMENT',
  WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT: 'WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT',
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT'
}

const openBrowserDefault = (container, browser) => {
  const url = container.caps[Capabilities.WEBDRIVERIO_URL]

  return browser
    .url(url)
    .getTitle().then((title) => {
      debug(`URL ${url} opened, page title: ${title}`)
    })
}

const openBotDefault = (container, browser) => {
  const inputElement = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000

  return browser
    .waitForVisible(inputElement, inputElementVisibleTimeout).then(() => {
      debug(`Input element ${inputElement} is visible`)
    })
}

const sendToBotDefault = (container, browser, msg) => {
  const inputElement = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]

  return browser
    .setValue(inputElement, msg.messageText)
    .keys('Enter')
    .pause(3000)
}

const receiveFromBotDefault = (container, browser) => {
  const outputElement = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT]

  let cancelled = false
  let nextloop = false
  let currentCount = 0
  async.until(
    () => cancelled,
    (cb) => {
      nextloop = false
      browser
        .waitUntil(() => browser.elements(outputElement).then((r) => r.value.length > currentCount), 20000)
        .catch(() => {
          nextloop = true
        })
        .then(() => {
          if (cancelled || nextloop) return
          return browser.elements(outputElement)
        })
        .then((r) => {
          if (cancelled || nextloop) return

          for (let i = currentCount; i < r.value.length; i++) {
            debug(`Found new bot response element ${outputElement}, id ${r.value[i].ELEMENT}`)
            getBotMessageDefault(container, browser, r.value[i].ELEMENT)
          }
          currentCount = r.value.length
        })
        .then(() => cb())
        .catch((err) => {
          debug(`Failed in receiving from bot: ${err}`)
          cb()
        })
    },
    (err) => {
      if (err) {
        debug(`receiveFromBot failed: ${err}`)
      }
    })

  return () => { cancelled = true }
}

const getBotMessageDefault = (container, browser, elementId) => {
  debug(`getBotMessageDefault receiving text for element ${elementId}`)

  browser.elementIdText(elementId).then((elementValue) => {
    debug('received elementValue ', elementValue)
    const botMsg = { sender: 'bot', sourceData: { elementValue, elementId }, messageText: elementValue.value }
    container.queueBotSays(botMsg)
  })
}

class BotiumConnectorWebdriverIO {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.WEBDRIVERIO_OPTIONS]) throw new Error('WEBDRIVERIO_OPTIONS capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_URL] && !this.caps[Capabilities.WEBDRIVERIO_OPENBROWSER]) throw new Error('WEBDRIVERIO_URL or WEBDRIVERIO_OPENBROWSER capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_OPENBOT]) throw new Error('WEBDRIVERIO_INPUT_ELEMENT or WEBDRIVERIO_OPENBOT capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_SENDTOBOT]) throw new Error('WEBDRIVERIO_INPUT_ELEMENT or WEBDRIVERIO_SENDTOBOT capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_RECEIVEFROMBOT]) throw new Error('WEBDRIVERIO_OUTPUT_ELEMENT or WEBDRIVERIO_RECEIVEFROMBOT capability required')

    this.openBrowser = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBROWSER, openBrowserDefault)
    this.openBot = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBOT, openBotDefault)
    this.sendToBot = this._loadFunction(Capabilities.WEBDRIVERIO_SENDTOBOT, sendToBotDefault)
    this.receiveFromBot = this._loadFunction(Capabilities.WEBDRIVERIO_RECEIVEFROMBOT, receiveFromBotDefault)

    return Promise.resolve()
  }

  Build () {
    debug('Build called')
    return Promise.resolve()
  }

  Start () {
    debug('Start called')

    return this._stopBrowser()
      .then(() => {
        this.browser = webdriverio.remote(this.caps[Capabilities.WEBDRIVERIO_OPTIONS])
      })
      .then(() => this.browser.init())
      .then(() => this.openBrowser(this, this.browser) || Promise.resolve())
      .then(() => {
        this.cancelReceive = this.receiveFromBot(this, this.browser)
      })
      .then(() => this.openBot(this, this.browser) || Promise.resolve())
  }

  UserSays (msg) {
    debug('UserSays called')
    return this.sendToBot(this, this.browser, msg)
  }

  Stop () {
    debug('Stop called')
    return this._stopBrowser()
  }

  Clean () {
    debug('Clean called')
    return this._stopBrowser()
  }

  _stopBrowser () {
    if (this.cancelReceive) {
      this.cancelReceive()
    }
    if (this.browser) {
      return this.browser.end().then(() => { this.browser = null })
    }
    return Promise.resolve()
  }

  _loadFunction (capName, defaultFunction) {
    if (this.caps[capName]) {
      if (_.isFunction(this.caps[capName])) {
        return this.caps[capName]
      } else {
        try {
          const c = require(this.caps[capName])
          if (_.isFunction(c)) return c
          else throw new Error(`not a function`)
        } catch (err) {
          const errMsg = `Failed loading script ${this.caps[capName]}: ${err}`
          debug(errMsg)
          throw new Error(errMsg)
        }
      }
    } else {
      return defaultFunction
    }
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorWebdriverIO
}
