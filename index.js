const util = require('util')
const vm = require('vm')
const path = require('path')
const mime = require('mime-types')
const webdriverio = require('webdriverio')
const esprima = require('esprima')
const Mustache = require('mustache')
const crypto = require('crypto')
const Queue = require('better-queue')
const chromedriver = require('chromedriver')
const selenium = require('selenium-standalone')
const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio')

const dialogflowComProfile = require('./profiles/dialogflow_com')
const botbuilderWebchatV3Profile = require('./profiles/botbuilder_webchat_v3')
const botbuilderWebchatV4Profile = require('./profiles/botbuilder_webchat_v4')
const botbuilderWebchatV41Profile = require('./profiles/botbuilder_webchat_v4_10_0')
const watsonpreviewProfile = require('./profiles/watsonpreview')

const profiles = {
  dialogflow_com: dialogflowComProfile,
  botbuilder_webchat_v3: botbuilderWebchatV3Profile,
  botbuilder_webchat_v4: botbuilderWebchatV4Profile,
  botbuilder_webchat_v4_10_0: botbuilderWebchatV41Profile,
  watsonpreview: watsonpreviewProfile
}

const Capabilities = {
  WEBDRIVERIO_OPTIONS: 'WEBDRIVERIO_OPTIONS',
  WEBDRIVERIO_URL: 'WEBDRIVERIO_URL',
  WEBDRIVERIO_PROFILE: 'WEBDRIVERIO_PROFILE',
  WEBDRIVERIO_OPENBROWSER: 'WEBDRIVERIO_OPENBROWSER',
  WEBDRIVERIO_OPENBOT: 'WEBDRIVERIO_OPENBOT',
  WEBDRIVERIO_OPENBOTPAUSE: 'WEBDRIVERIO_OPENBOTPAUSE',
  WEBDRIVERIO_SENDTOBOT: 'WEBDRIVERIO_SENDTOBOT',
  WEBDRIVERIO_RECEIVEFROMBOT: 'WEBDRIVERIO_RECEIVEFROMBOT',
  WEBDRIVERIO_GETBOTMESSAGE: 'WEBDRIVERIO_GETBOTMESSAGE',
  WEBDRIVERIO_HTTP_PROXY: 'WEBDRIVERIO_HTTP_PROXY',
  WEBDRIVERIO_HTTPS_PROXY: 'WEBDRIVERIO_HTTPS_PROXY',
  WEBDRIVERIO_NO_PROXY: 'WEBDRIVERIO_NO_PROXY',
  WEBDRIVERIO_SHADOW_ROOT: 'WEBDRIVERIO_SHADOW_ROOT',
  WEBDRIVERIO_INPUT_ELEMENT: 'WEBDRIVERIO_INPUT_ELEMENT',
  WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT: 'WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT',
  WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON',
  WEBDRIVERIO_INPUT_ELEMENT_BUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_BUTTON',
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML: 'WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE',
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: 'WEBDRIVERIO_IGNOREUPFRONTMESSAGES',
  WEBDRIVERIO_IGNOREWELCOMEMESSAGES: 'WEBDRIVERIO_IGNOREWELCOMEMESSAGES',
  WEBDRIVERIO_IGNOREEMPTYMESSAGES: 'WEBDRIVERIO_IGNOREEMPTYMESSAGES',
  WEBDRIVERIO_USERNAME: 'WEBDRIVERIO_USERNAME',
  WEBDRIVERIO_PASSWORD: 'WEBDRIVERIO_PASSWORD',
  WEBDRIVERIO_SCREENSHOTS: 'WEBDRIVERIO_SCREENSHOTS',
  WEBDRIVERIO_VIEWPORT_SIZE: 'WEBDRIVERIO_VIEWPORT_SIZE',
  WEBDRIVERIO_SELENIUM_DEBUG: 'WEBDRIVERIO_SELENIUM_DEBUG',
  WEBDRIVERIO_START_SELENIUM: 'WEBDRIVERIO_START_SELENIUM',
  WEBDRIVERIO_START_SELENIUM_OPTS: 'WEBDRIVERIO_START_SELENIUM_OPTS',
  WEBDRIVERIO_START_CHROMEDRIVER: 'WEBDRIVERIO_START_CHROMEDRIVER',
  WEBDRIVERIO_START_CHROMEDRIVER_ARGS: 'WEBDRIVERIO_START_CHROMEDRIVER_ARGS'
}

const openBrowserDefault = async (container, browser) => {
  const url = container.caps[Capabilities.WEBDRIVERIO_URL]

  await browser.url(url)
  const title = await browser.getTitle()
  debug(`URL ${url} opened, page title: ${title}`)
  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
    const html = await browser.execute('return document.documentElement.outerHTML;')
    debug(html)
  }
  if (container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE]) {
    await browser.setViewportSize(container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE])
  }
  try {
    await browser.execute('window.localStorage.clear();')
    debug(`URL ${url} opened, deleted local storage`)
  } catch (err) {
    debug(`openBrowser failed to delete local storage: ${err.message}`)
  }
  try {
    await browser.execute('window.sessionStorage.clear();')
    debug(`URL ${url} opened, deleted session storage`)
  } catch (err) {
    debug(`openBrowser failed to delete session storage: ${err.message}`)
  }
}

const openBotDefault = async (container, browser) => {
  const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000

  const inputElement = await container.findElement(inputElementSelector)
  await inputElement.waitForDisplayed(inputElementVisibleTimeout)
  debug(`Input element ${inputElementSelector} is visible`)
}

const sendToBotDefault = async (container, browser, msg) => {
  const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000
  const inputElementSendButtonSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON]

  if (msg.buttons && msg.buttons.length > 0) {
    const qrView = {
      button: {
        text: msg.buttons[0].text || msg.buttons[0].payload,
        payload: msg.buttons[0].payload || msg.buttons[0].text
      }
    }
    qrView.button.textlower = qrView.button.text && qrView.button.text.toLowerCase()
    qrView.button.payloadlower = qrView.button.payload && qrView.button.payload.toLowerCase()

    const qrSelectorTemplate = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_BUTTON] || '//button[contains(translate(., \'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ\',\'abcdefghijklmnopqrstuvwxyzäöü\'),\'{{button.textlower}}\')][last()] | //a[contains(translate(., \'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ\',\'abcdefghijklmnopqrstuvwxyzäöü\'),\'{{button.textlower}}\')][last()]'
    const qrSelector = Mustache.render(qrSelectorTemplate, qrView)
    debug(`Waiting for button element to be visible: ${qrSelector}`)

    const qrElement = await container.findElement(qrSelector)
    await qrElement.waitForEnabled(inputElementVisibleTimeout)
    debug(`button ${qrSelector} is visible, simulating click`)
    await qrElement.click()
  } else {
    const inputElement = await container.findElement(inputElementSelector)
    await inputElement.waitForEnabled(inputElementVisibleTimeout)
    debug(`input element ${inputElementSelector} is visible, simulating input: "${msg.messageText}"`)
    if (inputElementSendButtonSelector) {
      debug(`input element ${inputElementSelector} is visible, simulating input: "${msg.messageText}" (with Send button ${inputElementSendButtonSelector})`)
      await inputElement.setValue([...msg.messageText])
      const inputElementSendButton = await container.findElement(inputElementSendButtonSelector)
      await inputElementSendButton.waitForEnabled(inputElementVisibleTimeout)
      debug(`input button ${inputElementSendButtonSelector} is visible, simulating click`)
      await inputElementSendButton.click()
    } else {
      debug(`input element ${inputElementSelector} is visible, simulating input: "${msg.messageText}" (with Enter key)`)
      await inputElement.setValue([...msg.messageText, 'Enter'])
    }
  }
}

const receiveFromBotDefault = async (container, browser) => {
  const outputElement = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT]
  const r = await container.findElements(outputElement)
  return r
}

const urlRegexp = /(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?/
const getBotMessageDefault = async (container, browser, element, html) => {
  debug(`getBotMessageDefault receiving text for element ${element.ELEMENT || element.elementId}`)

  const botMsg = { sender: 'bot', sourceData: { elementId: element.ELEMENT || element.elementId, html } }

  const isNested = (capName, def) => {
    if (!Object.prototype.hasOwnProperty.call(container.caps, capName)) return def
    return !!container.caps[capName]
  }

  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]) {
    if (isNested(Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED, true)) {
      const textElement = await element.$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT])
      if (textElement) {
        botMsg.messageText = await textElement.getText()
      }
    } else {
      const textElement = await container.findElement(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT])
      if (textElement) {
        botMsg.messageText = await textElement.getText()
      }
    }
  } else {
    botMsg.messageText = await element.getText()
  }

  let buttonElements
  if (isNested(Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED, true)) {
    buttonElements = await element.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS] || './/button | .//a[@href]')
  } else {
    buttonElements = await container.findElements(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS] || './/button | .//a[@href]')
  }

  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS]) {
    const extraButtonElements = await container.findElements(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS])
    if (extraButtonElements) {
      buttonElements = (buttonElements || []).concat(extraButtonElements)
    }
  }

  for (const buttonElement of (buttonElements || [])) {
    const buttonElementText = await buttonElement.getText()
    if (buttonElementText) {
      const button = {
        text: buttonElementText
      }
      const buttonHrefValue = await buttonElement.getAttribute('href')
      if (buttonHrefValue) {
        button.payload = buttonHrefValue
      } else {
        const buttonHtml = await buttonElement.getHTML()
        if (buttonHtml) {
          const foundLink = buttonHtml.match(urlRegexp)
          if (foundLink && foundLink.length > 0) {
            button.payload = foundLink[0]
          }
        }
      }

      botMsg.buttons = botMsg.buttons || []
      botMsg.buttons.push(button)
    }
  }

  let mediaElements
  if (isNested(Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED, true)) {
    mediaElements = await element.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA] || './/img | .//video | .//audio')
  } else {
    mediaElements = await container.findElements(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA] || './/img | .//video | .//audio')
  }
  for (const mediaElement of (mediaElements || [])) {
    const mediaSrcValue = await mediaElement.getAttribute('src')
    if (mediaSrcValue) {
      const mediaAltValue = await mediaElement.getAttribute('alt')
      botMsg.media = botMsg.media || []
      botMsg.media.push({
        mediaUri: mediaSrcValue,
        mimeType: mime.lookup(mediaSrcValue) || 'application/unknown',
        altText: mediaAltValue
      })
    }
  }

  if (botMsg.messageText || (botMsg.buttons && botMsg.buttons.length > 0) || (botMsg.media && botMsg.media.length > 0) || !container.caps[Capabilities.WEBDRIVERIO_IGNOREEMPTYMESSAGES]) return container.BotSays(botMsg)
  else debug(`getBotMessageDefault ignoring empty element ${element.ELEMENT || element.elementId}`)
}

class BotiumConnectorWebdriverIO {
  constructor ({ container, queueBotSays, eventEmitter, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.eventEmitter = eventEmitter
    this.caps = caps
    this.handledElement = []
    this.screenshotCounterBySection = {}
  }

  async Validate () {
    debug('Validate called')

    if (this.caps[Capabilities.WEBDRIVERIO_PROFILE]) {
      const profile = profiles[this.caps[Capabilities.WEBDRIVERIO_PROFILE]]
      if (!profile) throw new Error('WEBDRIVERIO_PROFILE capability invalid')
      this.caps = Object.assign(this.caps, profile)
    }

    if (!this.caps[Capabilities.WEBDRIVERIO_OPTIONS] && !this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) throw new Error('WEBDRIVERIO_OPTIONS capability required (except when using WEBDRIVERIO_START_CHROMEDRIVER)')
    if (!this.caps[Capabilities.WEBDRIVERIO_URL] && !this.caps[Capabilities.WEBDRIVERIO_OPENBROWSER]) throw new Error('WEBDRIVERIO_URL or WEBDRIVERIO_OPENBROWSER or WEBDRIVERIO_PROFILE capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_OPENBOT]) throw new Error('WEBDRIVERIO_INPUT_ELEMENT or WEBDRIVERIO_OPENBOT or WEBDRIVERIO_PROFILE capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_SENDTOBOT]) throw new Error('WEBDRIVERIO_INPUT_ELEMENT or WEBDRIVERIO_SENDTOBOT or WEBDRIVERIO_PROFILE capability required')
    if (!this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT] && !this.caps[Capabilities.WEBDRIVERIO_RECEIVEFROMBOT]) throw new Error('WEBDRIVERIO_OUTPUT_ELEMENT or WEBDRIVERIO_RECEIVEFROMBOT or WEBDRIVERIO_PROFILE capability required')

    this.openBrowser = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBROWSER, openBrowserDefault)
    this.openBot = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBOT, openBotDefault)
    this.sendToBot = this._loadFunction(Capabilities.WEBDRIVERIO_SENDTOBOT, sendToBotDefault)
    this.receiveFromBot = this._loadFunction(Capabilities.WEBDRIVERIO_RECEIVEFROMBOT, receiveFromBotDefault)
    this.getBotMessage = this._loadFunction(Capabilities.WEBDRIVERIO_GETBOTMESSAGE, getBotMessageDefault)

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES] && !_.isNumber(this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES])) throw new Error('WEBDRIVERIO_IGNOREWELCOMEMESSAGES capability requires a number')

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES] && this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES] > 0) throw new Error('WEBDRIVERIO_IGNOREUPFRONTMESSAGES and WEBDRIVERIO_IGNOREWELCOMEMESSAGES are invalid in combination')

    if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] && ['none', 'onbotsays', 'onstop'].indexOf(this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS]) < 0) throw new Error('WEBDRIVERIO_SCREENSHOTS not in "none"/"onbotsays"/"onstop"')

    if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER] && this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM]) {
      throw new Error('WEBDRIVERIO_START_CHROMEDRIVER and WEBDRIVERIO_START_SELENIUM are invalid in combination')
    }

    if (this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS] && _.isString(this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS])) {
      try {
        JSON.parse(this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS])
      } catch (err) {
        throw new Error(`WEBDRIVERIO_START_SELENIUM_OPTS JSON.parse failed: ${err}`)
      }
    }
  }

  async Build () {
    debug('Build called')

    if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) {
      this.chromePort = Math.floor(Math.random() * 10000 + 40000)
      const chromeArgs = this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ARGS] || [`--port=${this.chromePort}`, '--url-base=wd/hub']
      debug(`Starting Chrome with args: ${chromeArgs}`)
      await chromedriver.start(chromeArgs, true)
    } else if (this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM]) {
      let seleniumOpts = this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS] || {}
      if (seleniumOpts && _.isString(seleniumOpts)) {
        seleniumOpts = JSON.parse(seleniumOpts)
      }

      debug(`Starting selenium with opts: ${util.inspect(seleniumOpts)}`)
      return new Promise((resolve, reject) => {
        selenium.start(seleniumOpts, (err, child) => {
          if (err) {
            reject(new Error(`Failed to start selenium: ${err}`))
          } else {
            this.seleniumChild = child
            resolve()
          }
        })
      })
    }
  }

  async Start () {
    debug('Start called')
    this.stopped = false
    this.handledElements = []

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]) {
      this.ignoreWelcomeMessageCounter = this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]
    } else {
      this.ignoreWelcomeMessageCounter = 0
    }
    this.ignoreBotMessages = !!this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES]

    try {
      await this._stopBrowser()

      const options = this.caps[Capabilities.WEBDRIVERIO_OPTIONS] || {}
      if (!options.logLevel) {
        options.logLevel = this.caps[Capabilities.WEBDRIVERIO_SELENIUM_DEBUG] ? 'info' : 'silent'
      }

      if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) {
        options.protocol = 'http'
        options.hostname = '127.0.0.1'
        options.port = this.chromePort
        options.path = '/wd/hub'
        options.capabilities = Object.assign({
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: ['--headless', '--no-sandbox', '--disable-gpu']
          }
        }, options.capabilities || {})
      }

      if (this.caps[Capabilities.WEBDRIVERIO_HTTP_PROXY] || this.caps[Capabilities.WEBDRIVERIO_HTTPS_PROXY]) {
        const proxy = {
          proxyType: 'manual'
        }
        if (this.caps[Capabilities.WEBDRIVERIO_HTTP_PROXY]) {
          proxy.httpProxy = this.caps[Capabilities.WEBDRIVERIO_HTTP_PROXY]
        }
        if (this.caps[Capabilities.WEBDRIVERIO_HTTPS_PROXY]) {
          proxy.sslProxy = this.caps[Capabilities.WEBDRIVERIO_HTTPS_PROXY]
        }
        if (this.caps[Capabilities.WEBDRIVERIO_NO_PROXY]) {
          proxy.noProxy = this.caps[Capabilities.WEBDRIVERIO_NO_PROXY]
        }
        options.capabilities.proxy = proxy
      }
      debug(`Webdriver Options: ${JSON.stringify(options)}`)
      this.browser = await webdriverio.remote(options)
      if (this.stopped) throw new Error('Connector already stopped.') // Sometimes it takes too long for starting browser

      await this.openBrowser(this, this.browser)

      if (this.caps[Capabilities.WEBDRIVERIO_SHADOW_ROOT]) {
        const shadowRoot = await this.browser.$(this.caps[Capabilities.WEBDRIVERIO_SHADOW_ROOT])
        await shadowRoot.waitForDisplayed(10000)
        debug(`Using shadow root element ${this.caps[Capabilities.WEBDRIVERIO_SHADOW_ROOT]}`)

        this.findElement = (selector) => shadowRoot.shadow$(selector)
        this.findElements = (selector) => shadowRoot.shadow$$(selector)
      } else {
        this.findElement = (selector) => this.browser.$(selector)
        this.findElements = (selector) => this.browser.$$(selector)
      }

      await this.openBot(this, this.browser)
      if (this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE]) {
        await this.browser.pause(this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE])
      }

      this.queue = new Queue((input, cb) => {
        if (this.stopped) return cb()
        if (!this.browser) return cb()
        input().then(result => cb(null, result)).catch(err => {
          debug(`Error in Webdriver processing: ${err.message || util.inspect(err)}`)
          cb(err)
        })
      })

      if (this.ignoreWelcomeMessageCounter > 0) {
        debug(`Waiting for ${this.ignoreWelcomeMessageCounter} welcome messages (will be ignored) ...`)
        await new Promise((resolve) => {
          this.ignoreWelcomeMessagesResolve = resolve
          this.queue.push(() => this._handleNewElements())
        })
      } else {
        this.ignoreWelcomeMessagesResolve = null
        this.queue.push(() => this._handleNewElements())
      }

      return {
        browserSessionId: this.browser.sessionId
      }
    } catch (err) {
      debug(`WebDriver error on startup: ${err.message || util.inspect(err)}`)
      throw new Error(`WebDriver error on startup: ${err.message || util.inspect(err)}`)
    } finally {
      if (debug.enabled) {
        if (this.queue) {
          await this._runInQueue(async () => {
            await this._saveDebugScreenshot('onstart')
          })
        } else {
          await this._saveDebugScreenshot('onstart')
        }
      }
    }
  }

  async UserSays (msg) {
    debug(`UserSays called "${msg.messageText}"`)
    await this._runInQueue(async () => {
      try {
        await this.sendToBot(this, this.browser, msg)
        this.ignoreBotMessages = false
      } catch (err) {
        debug(`WebDriver error on UserSays: ${err.message || util.inspect(err)}`)
        throw new Error(`WebDriver error on UserSays: ${err.message || util.inspect(err)}`)
      } finally {
        if (debug.enabled) await this._saveDebugScreenshot('usersays')
      }
    })
  }

  async BotSays (msg) {
    debug(`BotSays called ${util.inspect(msg)}`)

    if (this.ignoreBotMessages) {
      debug('BotSays ignoring upfront message')
    } else if (this.ignoreWelcomeMessageCounter > 0) {
      this.ignoreWelcomeMessageCounter--
      debug(`BotSays ignoring welcome message, ${this.ignoreWelcomeMessageCounter} remaining`)
      if (this.ignoreWelcomeMessageCounter === 0 && this.ignoreWelcomeMessagesResolve) {
        this.ignoreWelcomeMessagesResolve()
        this.ignoreWelcomeMessagesResolve = null
      }
    } else {
      if (this.browser && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onbotsays') {
        const screenshot = await this._takeScreenshot('onbotsays')
        if (screenshot) {
          msg.attachments = msg.attachments || []
          msg.attachments.push(screenshot)
          if (debug.enabled) await this._saveDebugScreenshot('usersays')
        }
      }
      if (debug.enabled) await this._saveDebugScreenshot('onbotsays')
      this.queueBotSays(msg)
    }
  }

  async Stop () {
    debug('Stop called')

    if (this.browser && this.eventEmitter && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onstop') {
      await this._runInQueue(async () => {
        const screenshot = await this._takeScreenshot('onstop')
        if (screenshot) {
          this.eventEmitter.emit('MESSAGE_ATTACHMENT', this.container, screenshot)
        }
      })
    }
    await this._stopBrowser()
    this.stopped = true
  }

  async Clean () {
    debug('Clean called')
    await this._stopBrowser()
    if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) {
      debug('Stopping chromedriver')
      chromedriver.stop()
    }
    if (this.seleniumChild) {
      debug('Killing selenium process')
      this.seleniumChild.kill('SIGKILL')
      this.seleniumChild = null
    }
  }

  async _runInQueue (fn) {
    if (this.queue) {
      return new Promise((resolve, reject) => {
        this.queue.push(fn)
          .on('finish', resolve)
          .on('failed', reject)
      })
    } else {
      throw new Error('Connector not yet started')
    }
  }

  async _handleNewElements () {
    try {
      const r = await this.receiveFromBot(this, this.browser)
      for (const element of (r || [])) {
        try {
          const html = await element.getHTML()

          let hashKey
          if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'HASH') {
            if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE]) {
              hashKey = await element.getAttribute(this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE])
            } else if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR]) {
              const hashElement = await element.$(this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR])
              const hashHtml = await hashElement.getHTML()
              hashKey = crypto.createHash('md5').update(hashHtml).digest('hex')
            } else if (html) {
              hashKey = crypto.createHash('md5').update(html).digest('hex')
            } else {
              continue
            }
          } else if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'TEXT') {
            hashKey = await element.getText()
          } else {
            hashKey = `${element.ELEMENT || element.elementId}`
          }
          if (this.handledElements.indexOf(hashKey) < 0) {
            debug(`Found new bot response element, id ${element.ELEMENT || element.elementId}, hashKey ${hashKey}`)

            if (html && this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
              debug(html)
            }
            this.handledElements.push(hashKey)
            if (this.queue) this.queue.push(() => this.getBotMessage(this, this.browser, element, html))
          }
        } catch (err) {
          debug(`Failed in getBotMessage, skipping: ${err}`)
        }
      }
    } catch (err) {
      debug(`Failed in receiving from bot: ${err}`)
    }
    setTimeout(() => {
      if (this.queue) {
        this.queue.push(() => this._handleNewElements())
      }
    }, 1000)
  }

  async _stopBrowser () {
    const localStop = async () => {
      try {
        await this.browser.deleteSession()
        await this.browser.pause(2000) // workaround to shut down chrome driver https://github.com/webdriverio-boneyard/wdio-selenium-standalone-service/issues/28
      } catch (err) {
        debug(`WARNING: browser.deleteSession failed - ${err.message || util.inspect(err)}`)
      }
    }

    if (this.browser) {
      if (this.queue) {
        await this._runInQueue(() => localStop())
      } else {
        await localStop()
      }
    }
    if (this.queue) {
      await new Promise((resolve) => this.queue.destroy(resolve))
    }
    this.browser = null
    this.queue = null
  }

  _loadFunction (capName, defaultFunction) {
    if (this.caps[capName]) {
      if (_.isFunction(this.caps[capName])) {
        return this.caps[capName]
      }
      const loadErr = []

      try {
        const c = require(this.caps[capName])
        if (_.isFunction(c)) {
          debug(`Loaded Capability ${capName} function from NPM package ${this.caps[capName]}`)
          return c
        } else throw new Error(`NPM package ${this.caps[capName]} not exporting single function.`)
      } catch (err) {
        loadErr.push(`Loading Capability ${capName} function from NPM package ${this.caps[capName]} failed - ${err.message || util.inspect(err)}`)
      }

      const tryLoadFile = path.resolve(process.cwd(), this.caps[capName])
      try {
        const c = require(tryLoadFile)
        if (_.isFunction(c)) {
          debug(`Loaded Capability ${capName} function from file ${tryLoadFile}`)
          return c
        } else throw new Error(`File ${tryLoadFile} not exporting single function.`)
      } catch (err) {
        loadErr.push(`Loading Capability ${capName} function from file ${tryLoadFile} failed - ${err.message || util.inspect(err)}`)
      }

      try {
        esprima.parseScript(this.caps[capName])
        debug(`Loaded Capability ${capName} function as javascript`)

        return (container, browser) => {
          const sandbox = {
            container,
            browser,
            result: null,
            debug,
            console
          }
          vm.createContext(sandbox)
          vm.runInContext(this.caps[capName], sandbox)
          return sandbox.result || Promise.resolve()
        }
      } catch (err) {
        loadErr.push(`Loading Capability ${capName} function as javascript failed - no valid javascript ${err.message || util.inspect(err)}`)
      }

      loadErr.forEach(d => debug(d))
      throw new Error(`Failed to fetch Capability ${capName} function, no idea how to load ...`)
    } else {
      return defaultFunction
    }
  }

  async _takeScreenshot (section) {
    if (this.browser) {
      try {
        const filename = path.resolve(this.container.tempDirectory, `${section}_${this._screenshotSectionCounter(section)}_.png`)
        const buffer = await this.browser.saveScreenshot(filename)
        debug(`Screenshot taken, size ${buffer.length}, saved to ${filename}`)
        return {
          base64: buffer.toString('base64'),
          mimeType: 'image/png'
        }
      } catch (err) {
        const errMsg = `Failed to take screenshot: ${err.message || util.inspect(err)}`
        debug(errMsg)
        throw new Error(errMsg)
      }
    }
  }

  async _saveDebugScreenshot (section) {
    if (this.browser) {
      try {
        const filename = path.resolve(this.container.tempDirectory, `${section}_${this._screenshotSectionCounter(section)}_.png`)
        await this.browser.saveScreenshot(filename)
        debug(`Saved debugging screenshot to ${filename}`)
      } catch (err) {
        debug(`Failed to take debug screenshot: ${err.message || util.inspect(err)}`)
      }
    } else {
      debug('Failed to take debug screenshot - browser already closed')
    }
  }

  _screenshotSectionCounter (section) {
    if (Object.prototype.hasOwnProperty.call(this.screenshotCounterBySection, section)) {
      this.screenshotCounterBySection[section]++
    } else {
      this.screenshotCounterBySection[section] = 1
    }
    return this.screenshotCounterBySection[section]
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorWebdriverIO,
  PluginDesc: {
    name: 'WebdriverIO (Selenium or Appium)',
    provider: 'Selenium',
    capabilities: [
      {
        name: 'WEBDRIVERIO_PROFILE',
        label: 'Webdriver Script',
        type: 'choice',
        required: false,
        choices: [
          { name: 'Google Dialogflow Web Demo', key: 'dialogflow_com' },
          { name: 'MS BotBuilder Webchat (v3)', key: 'botbuilder_webchat_v3' },
          { name: 'MS BotBuilder Webchat (v4)', key: 'botbuilder_webchat_v4' },
          { name: 'MS BotBuilder Webchat (v4.10.0)', key: 'botbuilder_webchat_v4_10_0' },
          { name: 'IBM Watson Assistant Preview Link', key: 'watsonpreview' }
        ]
      }
    ]
  }
}
