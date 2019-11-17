const util = require('util')
const vm = require('vm')
const path = require('path')
const mime = require('mime-types')
const webdriverio = require('webdriverio')
const esprima = require('esprima')
const Mustache = require('mustache')
const phantomjs = require('phantomjs-prebuilt')
const selenium = require('selenium-standalone')
const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio')

const dialogflowComProfile = require('./profiles/dialogflow_com')
const botbuilderWebchatV3Profile = require('./profiles/botbuilder_webchat_v3')
const botbuilderWebchatV4Profile = require('./profiles/botbuilder_webchat_v4')
const watsonpreviewProfile = require('./profiles/watsonpreview')

const profiles = {
  dialogflow_com: dialogflowComProfile,
  botbuilder_webchat_v3: botbuilderWebchatV3Profile,
  botbuilder_webchat_v4: botbuilderWebchatV4Profile,
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
  WEBDRIVERIO_INPUT_ELEMENT: 'WEBDRIVERIO_INPUT_ELEMENT',
  WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT: 'WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT',
  WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON',
  WEBDRIVERIO_INPUT_ELEMENT_BUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_BUTTON',
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML: 'WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML',
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: 'WEBDRIVERIO_IGNOREUPFRONTMESSAGES',
  WEBDRIVERIO_IGNOREWELCOMEMESSAGES: 'WEBDRIVERIO_IGNOREWELCOMEMESSAGES',
  WEBDRIVERIO_IGNOREEMPTYMESSAGES: 'WEBDRIVERIO_IGNOREEMPTYMESSAGES',
  WEBDRIVERIO_USERNAME: 'WEBDRIVERIO_USERNAME',
  WEBDRIVERIO_PASSWORD: 'WEBDRIVERIO_PASSWORD',
  WEBDRIVERIO_SCREENSHOTS: 'WEBDRIVERIO_SCREENSHOTS',
  WEBDRIVERIO_VIEWPORT_SIZE: 'WEBDRIVERIO_VIEWPORT_SIZE',
  WEBDRIVERIO_START_SELENIUM: 'WEBDRIVERIO_START_SELENIUM',
  WEBDRIVERIO_START_SELENIUM_OPTS: 'WEBDRIVERIO_START_SELENIUM_OPTS',
  WEBDRIVERIO_START_PHANTOMJS: 'WEBDRIVERIO_START_PHANTOMJS',
  WEBDRIVERIO_START_PHANTOMJS_ARGS: 'WEBDRIVERIO_START_PHANTOMJS_ARGS'
}

const openBrowserDefault = async (container, browser) => {
  const url = container.caps[Capabilities.WEBDRIVERIO_URL]

  await browser.url(url)
  const title = await browser.getTitle()
  debug(`URL ${url} opened, page title: ${title}`)
  if (container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE]) {
    await browser.setViewportSize(container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE])
  }
}

const openBotDefault = async (container, browser) => {
  const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000

  const inputElement = await browser.$(inputElementSelector)
  await inputElement.waitForDisplayed(inputElementVisibleTimeout)
  debug(`Input element ${inputElementSelector} is visible`)
}

const sendToBotDefault = async (container, browser, msg) => {
  const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000
  const inputElementSendButtonSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON]

  if (msg.buttons && msg.buttons.length > 0) {
    const qrSelectorTemplate = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_BUTTON] || '//button[contains(text(),\'{{button.text}}\')][last()] | //a[contains(text(),\'{{button.text}}\')][last()]'
    const qrSelector = Mustache.render(qrSelectorTemplate, { button: msg.buttons[0] })
    debug(`Waiting for button element to be visible: ${qrSelector}`)

    const qrElement = await browser.$(qrSelector)
    await qrElement.waitForEnabled(inputElementVisibleTimeout)
    debug(`button ${qrSelector} is visible, simulating click`)
    await qrElement.click()
  } else {
    const inputElement = await browser.$(inputElementSelector)
    await inputElement.waitForEnabled(inputElementVisibleTimeout)
    debug(`input element ${inputElementSelector} is visible, simulating input`)
    if (inputElementSendButtonSelector) {
      await inputElement.setValue(msg.messageText)
      const inputElementSendButton = await browser.$(inputElementSendButtonSelector)
      await inputElementSendButton.waitForEnabled(inputElementVisibleTimeout)
      debug(`input button ${inputElementSendButtonSelector} is visible, simulating click`)
      await inputElementSendButton.click()
    } else {
      await inputElement.setValue([...msg.messageText, 'Enter'])
      // await browser.elementSendKeys(inputElement.ELEMENT, ['Enter'])
      // await browser.keys('Enter')
    }
  }
}

const receiveFromBotDefault = (container, browser) => {
  const outputElement = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT]

  let cancelled = false
  const handledElements = []

  const worker = async () => {
    while (!cancelled) { // eslint-disable-line no-unmodified-loop-condition
      debug(`polling for bot output (${outputElement}, currentCount: ${handledElements.length}`)
      try {
        await browser.waitUntil(async () => {
          const r = await browser.$$(outputElement)
          return cancelled || r.length > handledElements.length
        }, 5000)
      } catch (err) {
        if (!cancelled) {
          debug('Continue polling for bot output ...')
          continue
        }
      }
      try {
        if (cancelled) break
        const r = await browser.$$(outputElement)
        if (cancelled) break

        for (let i = 0; i < r.length; i++) {
          if (handledElements.indexOf(r[i].ELEMENT) < 0) {
            debug(`Found new bot response element ${outputElement}, id ${r[i].ELEMENT}`)

            try {
              if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
                const html = await browser.execute('return arguments[0].outerHTML;', r[i])
                debug(html)
              }
              await container.getBotMessage(container, browser, r[i])
              handledElements.push(r[i].ELEMENT)
            } catch (err) {
              debug(`Failed in getBotMessage, skipping: ${err}`)
            }
          }
        }
      } catch (err) {
        debug(`Failed in receiving from bot: ${err}`)
      }
    }
  }
  worker().catch((err) => debug(err))

  return () => { cancelled = true }
}

const getBotMessageDefault = async (container, browser, element) => {
  debug(`getBotMessageDefault receiving text for element ${element.ELEMENT}`)

  const botMsg = { sender: 'bot', sourceData: { elementId: element.ELEMENT } }

  const isNested = (capName, def) => {
    if (!Object.prototype.hasOwnProperty.call(container.caps, capName)) return def
    return !!container.caps[capName]
  }

  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]) {
    if (isNested(Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED, true)) {
      const textElement = element.$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT])
      if (textElement) {
        botMsg.messageText = await textElement.getText()
      }
    } else {
      const textElement = await browser.$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT])
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
    buttonElements = await browser.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS] || './/button | .//a[@href]')
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
      }

      botMsg.buttons = botMsg.buttons || []
      botMsg.buttons.push(button)
    }
  }

  let mediaElements
  if (isNested(Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED, true)) {
    mediaElements = await element.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA] || './/img | .//video | .//audio')
  } else {
    mediaElements = await browser.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA] || './/img | .//video | .//audio')
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
}

class BotiumConnectorWebdriverIO {
  constructor ({ container, queueBotSays, eventEmitter, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.eventEmitter = eventEmitter
    this.caps = caps
    this.screenshotCounterBySection = {}
  }

  async Validate () {
    debug('Validate called')

    if (this.caps[Capabilities.WEBDRIVERIO_PROFILE]) {
      const profile = profiles[this.caps[Capabilities.WEBDRIVERIO_PROFILE]]
      if (!profile) throw new Error('WEBDRIVERIO_PROFILE capability invalid')
      this.caps = Object.assign(this.caps, profile)
    }

    if (!this.caps[Capabilities.WEBDRIVERIO_OPTIONS] && !this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS]) throw new Error('WEBDRIVERIO_OPTIONS capability required (except when using WEBDRIVERIO_START_PHANTOMJS)')
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

    if (this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS] && this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM]) {
      throw new Error('WEBDRIVERIO_START_PHANTOMJS and WEBDRIVERIO_START_SELENIUM are invalid in combination')
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

    if (this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS]) {
      const phantomJsArgs = this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS_ARGS] || '--webdriver=4444'
      debug(`Starting phantomJS with args: ${phantomJsArgs}`)
      this.phantomJSProcess = await phantomjs.run(phantomJsArgs)
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
        options.logLevel = debug.enabled ? 'info' : 'silent'
      }

      if (!options.capabilities && this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS]) {
        options.capabilities = {
          browserName: 'phantomjs'
        }
      }
      this.browser = await webdriverio.remote(options)

      await this.openBrowser(this, this.browser)
      await this.openBot(this, this.browser)

      if (this.ignoreWelcomeMessageCounter > 0) {
        debug(`Waiting for ${this.ignoreWelcomeMessageCounter} welcome messages (will be ignored) ...`)
        await new Promise((resolve) => {
          this.ignoreWelcomeMessagesResolve = resolve
          this.cancelReceive = this.receiveFromBot(this, this.browser)
        })
      } else {
        this.ignoreWelcomeMessagesResolve = null
        this.cancelReceive = this.receiveFromBot(this, this.browser)
      }
      if (this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE]) {
        await this.browser.pause(this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE])
      }

      return {
        browserSessionId: this.browser.sessionId
      }
    } catch (err) {
      debug(`WebDriver error on startup: ${util.inspect(err)}`)
      if (debug.enabled) await this._saveDebugScreenshot('onstart')
      throw new Error(`WebDriver error on startup: ${util.inspect(err)}`)
    }
  }

  async UserSays (msg) {
    debug(`UserSays called ${util.inspect(msg)}`)
    try {
      await this.sendToBot(this, this.browser, msg)
      this.ignoreBotMessages = false
    } catch (err) {
      debug(`WebDriver error on UserSays: ${util.inspect(err)}`)
      if (debug.enabled) this._saveDebugScreenshot('usersays')
      throw new Error(`WebDriver error on UserSays: ${util.inspect(err)}`)
    }
  }

  async BotSays (msg) {
    debug(`BotSays called ${util.inspect(msg)}`)

    if (this.ignoreBotMessages) {
      debug('BotSays ignoring upfront message')
    } else if (this.ignoreWelcomeMessageCounter > 0) {
      this.ignoreWelcomeMessageCounter--
      debug(`BotSays ignoring welcome message, ${this.ignoreWelcomeMessageCounter} remaining ${util.inspect(msg)}`)
      if (this.ignoreWelcomeMessageCounter === 0 && this.ignoreWelcomeMessagesResolve) {
        this.ignoreWelcomeMessagesResolve()
        this.ignoreWelcomeMessagesResolve = null
      }
    } else {
      if (this.browser && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onbotsays') {
        const screenshot = await this._takeScreenshot('onbotsays')

        msg.attachments = msg.attachments || []
        msg.attachments.push(screenshot)
        if (debug.enabled) await this._saveDebugScreenshot('usersays')
      }
      this.queueBotSays(msg)
    }
  }

  async Stop () {
    debug('Stop called')

    if (this.browser && this.eventEmitter && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onstop') {
      const screenshot = await this._takeScreenshot('onstop')
      this.eventEmitter.emit('MESSAGE_ATTACHMENT', this.container, screenshot)
    }
    await this._stopBrowser()
  }

  async Clean () {
    debug('Clean called')
    await this._stopBrowser()
    if (this.phantomJSProcess) {
      debug(`Killing phantomJS process ${this.phantomJSProcess.pid}`)
      process.kill(this.phantomJSProcess.pid, 'SIGKILL')
      this.phantomJSProcess = null
    }
    if (this.seleniumChild) {
      debug('Killing selenium process')
      this.seleniumChild.kill('SIGKILL')
      this.seleniumChild = null
    }
  }

  async _stopBrowser () {
    if (this.cancelReceive) {
      this.cancelReceive()
    }
    if (this.browser) {
      try {
        await this.browser.deleteSession()
        await this.browser.pause(2000) // workaround to shut down chrome driver https://github.com/webdriverio-boneyard/wdio-selenium-standalone-service/issues/28
      } catch (err) {
        debug(`WARNING: browser.deleteSession failed - ${util.inspect(err)}`)
      }
      this.browser = null
    }
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
        loadErr.push(`Loading Capability ${capName} function from NPM package ${this.caps[capName]} failed - ${err.message}`)
      }

      const tryLoadFile = path.resolve(process.cwd(), this.caps[capName])
      try {
        const c = require(tryLoadFile)
        if (_.isFunction(c)) {
          debug(`Loaded Capability ${capName} function from file ${tryLoadFile}`)
          return c
        } else throw new Error(`File ${tryLoadFile} not exporting single function.`)
      } catch (err) {
        loadErr.push(`Loading Capability ${capName} function from file ${tryLoadFile} failed - ${err.message}`)
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
        loadErr.push(`Loading Capability ${capName} function as javascript failed - no valid javascript ${err.message}`)
      }

      loadErr.forEach(d => debug(d))
      throw new Error(`Failed to fetch Capability ${capName} function, no idea how to load ...`)
    } else {
      return defaultFunction
    }
  }

  async _takeScreenshot (section) {
    try {
      const filename = path.resolve(this.container.tempDirectory, `${section}_${this._screenshotSectionCounter(section)}_.png`)
      const buffer = await this.browser.saveScreenshot(filename)
      debug(`Screenshot taken, size ${buffer.length}, saved to ${filename}`)
      return {
        base64: buffer.toString('base64'),
        mimeType: 'image/png'
      }
    } catch (err) {
      const errMsg = `Failed to take screenshot: ${util.inspect(err)}`
      debug(errMsg)
      throw new Error(errMsg)
    }
  }

  async _saveDebugScreenshot (section) {
    try {
      const filename = path.resolve(this.container.tempDirectory, `${section}_${this._screenshotSectionCounter(section)}_.png`)
      await this.browser.saveScreenshot(filename)
      debug(`Saved debugging screenshot to ${filename}`)
    } catch (err) {
      debug(`Failed to take debug screenshot: ${util.inspect(err)}`)
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
  Profiles: {
    dialogflow_com: 'Google Dialogflow Web Demo',
    botbuilder_webchat_v3: 'MS BotBuilder Webchat (v3)',
    botbuilder_webchat_v4: 'MS BotBuilder Webchat (v4)',
    watsonpreview: 'IBM Watson Assistant Preview Link'
  }
}
