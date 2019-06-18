const util = require('util')
const vm = require('vm')
const fs = require('fs')
const path = require('path')
const async = require('async')
const mime = require('mime-types')
const webdriverio = require('webdriverio')
const esprima = require('esprima')
const phantomjs = require('phantomjs-prebuilt')
const selenium = require('selenium-standalone')
const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio')

const messengerComProfile = require('./profiles/messenger_com')
const dialogflowComProfile = require('./profiles/dialogflow_com')
const botbuilderWebchatV3Profile = require('./profiles/botbuilder_webchat_v3')
const botbuilderWebchatV4Profile = require('./profiles/botbuilder_webchat_v4')

const profiles = {
  'messenger_com': messengerComProfile,
  'dialogflow_com': dialogflowComProfile,
  'botbuilder_webchat_v3': botbuilderWebchatV3Profile,
  'botbuilder_webchat_v4': botbuilderWebchatV4Profile
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
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA',
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: 'WEBDRIVERIO_IGNOREUPFRONTMESSAGES',
  WEBDRIVERIO_IGNOREWELCOMEMESSAGES: 'WEBDRIVERIO_IGNOREWELCOMEMESSAGES',
  WEBDRIVERIO_USERNAME: 'WEBDRIVERIO_USERNAME',
  WEBDRIVERIO_PASSWORD: 'WEBDRIVERIO_PASSWORD',
  WEBDRIVERIO_SCREENSHOTS: 'WEBDRIVERIO_SCREENSHOTS',
  WEBDRIVERIO_VIEWPORT_SIZE: 'WEBDRIVERIO_VIEWPORT_SIZE',
  WEBDRIVERIO_START_SELENIUM: 'WEBDRIVERIO_START_SELENIUM',
  WEBDRIVERIO_START_SELENIUM_OPTS: 'WEBDRIVERIO_START_SELENIUM_OPTS',
  WEBDRIVERIO_START_PHANTOMJS: 'WEBDRIVERIO_START_PHANTOMJS',
  WEBDRIVERIO_START_PHANTOMJS_ARGS: 'WEBDRIVERIO_START_PHANTOMJS_ARGS'
}

const openBrowserDefault = (container, browser) => {
  const url = container.caps[Capabilities.WEBDRIVERIO_URL]

  return browser
    .url(url)
    .getTitle().then((title) => {
      debug(`URL ${url} opened, page title: ${title}`)
    })
    .then(() => container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE] && browser.setViewportSize(container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE]))
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
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000
  const inputElementSendButton = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON]

  if (msg.buttons && msg.buttons.length > 0) {
    const qrSelector = `button[title*='${msg.buttons[0].text}']:not(:disabled)`
    return browser
      .waitForVisible(qrSelector, inputElementVisibleTimeout)
      .click(qrSelector)
  }
  if (inputElementSendButton) {
    return browser
      .waitForEnabled(inputElement, inputElementVisibleTimeout)
      .setValue(inputElement, msg.messageText)
      .waitForVisible(inputElementSendButton, inputElementVisibleTimeout)
      .click(inputElementSendButton)
  } else {
    return browser
      .waitForEnabled(inputElement, inputElementVisibleTimeout)
      .setValue(inputElement, msg.messageText)
      .keys('Enter')
  }
}

const receiveFromBotDefault = (container, browser) => {
  const outputElement = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT]

  let cancelled = false
  let nextloop = false
  let currentCount = 0
  const handledElements = []
  async.until(
    () => cancelled,
    (cb) => {
      nextloop = false
      debug(`polling for bot output (${outputElement}, currentCount: ${currentCount}`)
      browser
        .waitUntil(() => browser.elements(outputElement).then((r) => r.value.length > currentCount), 5000)
        .catch(() => {
          if (!cancelled) {
            debug(`Continue polling for bot output ...`)
            nextloop = true
          }
        })
        .then(() => {
          if (cancelled || nextloop) return
          return browser.elements(outputElement)
        })
        .then((r) => {
          if (cancelled || nextloop) return

          let elementsPromise = Promise.resolve()
          for (let i = 0; i < r.value.length; i++) {
            if (handledElements.indexOf(r.value[i].ELEMENT) < 0) {
              handledElements.push(r.value[i].ELEMENT)
              elementsPromise = elementsPromise.then(() => {
                debug(`Found new bot response element ${outputElement}, id ${r.value[i].ELEMENT}`)
                return container.getBotMessage(container, browser, r.value[i].ELEMENT)
              })
            }
          }
          currentCount = r.value.length
          return elementsPromise
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

const getBotMessageDefault = async (container, browser, elementId) => {
  debug(`getBotMessageDefault receiving text for element ${elementId}`)

  const botMsg = { sender: 'bot', sourceData: { elementId } }

  let textElementId = elementId
  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]) {
    const textElement = await browser.elementIdElement(elementId, container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT])
    textElementId = textElement.value.ELEMENT
  }
  const textElementValue = await browser.elementIdText(textElementId)
  botMsg.messageText = textElementValue.value

  const buttonElementIds = await browser.elementIdElements(elementId, container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS] || './/button | .//a[@href]')
  for (let bi = 0; bi < buttonElementIds.value.length; bi++) {
    const buttonElementValue = await browser.elementIdText(buttonElementIds.value[bi].ELEMENT)
    if (buttonElementValue && buttonElementValue.value) {
      botMsg.buttons = botMsg.buttons || []
      botMsg.buttons.push({
        text: buttonElementValue.value
      })
    }
  }

  const mediaElementIds = await browser.elementIdElements(elementId, container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA] || './/img | .//video | .//audio')
  for (let mi = 0; mi < mediaElementIds.value.length; mi++) {
    const mediaSrcValue = await browser.elementIdAttribute(mediaElementIds.value[mi].ELEMENT, 'src')
    if (mediaSrcValue && mediaSrcValue.value) {
      const mediaAltValue = await browser.elementIdAttribute(mediaElementIds.value[mi].ELEMENT, 'alt')
      botMsg.media = botMsg.media || []
      botMsg.media.push({
        mediaUri: mediaSrcValue.value,
        mimeType: mime.lookup(mediaSrcValue.value) || 'application/unknown',
        altText: mediaAltValue && mediaAltValue.value
      })
    }
  }

  return container.BotSays(botMsg)
}

class BotiumConnectorWebdriverIO {
  constructor ({ container, queueBotSays, eventEmitter, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.eventEmitter = eventEmitter
    this.caps = caps
  }

  Validate () {
    debug('Validate called')

    if (this.caps[Capabilities.WEBDRIVERIO_PROFILE]) {
      const profile = profiles[this.caps[Capabilities.WEBDRIVERIO_PROFILE]]
      if (!profile) throw new Error('WEBDRIVERIO_PROFILE capability invalid')
      this.caps = Object.assign(this.caps, profile)
    }

    if (!this.caps[Capabilities.WEBDRIVERIO_OPTIONS]) throw new Error('WEBDRIVERIO_OPTIONS capability required')
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

    return Promise.resolve()
  }

  Build () {
    debug('Build called')

    if (this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS]) {
      const phantomJsArgs = this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS_ARGS] || '--webdriver=4444'
      debug(`Starting phantomJS with args: ${phantomJsArgs}`)
      return phantomjs.run(phantomJsArgs).then(program => {
        this.phantomJSProcess = program
      })
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
    } else {
      return Promise.resolve()
    }
  }

  Start () {
    debug('Start called')

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]) {
      this.ignoreWelcomeMessageCounter = this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]
    } else {
      this.ignoreWelcomeMessageCounter = 0
    }
    this.ignoreBotMessages = !!this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES]

    return this._stopBrowser()
      .then(() => {
        this.browser = webdriverio.remote(this.caps[Capabilities.WEBDRIVERIO_OPTIONS])
      })
      .then(() => this.browser.init())
      .then(() => this.openBrowser(this, this.browser) || Promise.resolve())
      .then(() => this.openBot(this, this.browser) || Promise.resolve())
      .then(() => {
        if (this.ignoreWelcomeMessageCounter > 0) {
          debug(`Waiting for ${this.ignoreWelcomeMessageCounter} welcome messages (will be ignored) ...`)
          return new Promise((resolve) => {
            this.ignoreWelcomeMessagesResolve = resolve
            this.cancelReceive = this.receiveFromBot(this, this.browser)
          })
        } else {
          this.ignoreWelcomeMessagesResolve = null
          this.cancelReceive = this.receiveFromBot(this, this.browser)
        }
      })
      .then(() => this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE] && this.browser.pause(this.caps[Capabilities.WEBDRIVERIO_OPENBOTPAUSE]))
      .then(() => this.browser.session())
      .then((session) => {
        return {
          browserSessionId: session.sessionId
        }
      })
      .catch((err) => {
        if (debug.enabled) this._saveDebugScreenshot('onstart')
        throw err
      })
  }

  UserSays (msg) {
    debug(`UserSays called ${util.inspect(msg)}`)
    return this.sendToBot(this, this.browser, msg)
      .then(() => { this.ignoreBotMessages = false })
      .catch((err) => {
        if (debug.enabled) this._saveDebugScreenshot('usersays')
        throw err
      })
  }

  BotSays (msg) {
    debug(`BotSays called ${util.inspect(msg)}`)

    if (this.ignoreBotMessages) {
      debug(`BotSays ignoring upfront message`)
    } else if (this.ignoreWelcomeMessageCounter > 0) {
      this.ignoreWelcomeMessageCounter--
      debug(`BotSays ignoring welcome message, ${this.ignoreWelcomeMessageCounter} remaining ${util.inspect(msg)}`)
      if (this.ignoreWelcomeMessageCounter === 0 && this.ignoreWelcomeMessagesResolve) {
        this.ignoreWelcomeMessagesResolve()
        this.ignoreWelcomeMessagesResolve = null
      }
    } else {
      let screenshotPromise = Promise.resolve()
      if (this.browser && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onbotsays') {
        screenshotPromise = this._takeScreenshot()
          .then((screenshot) => {
            msg.attachments = msg.attachments || []
            msg.attachments.push(screenshot)
          })
      }
      return screenshotPromise.then(() => this.queueBotSays(msg))
    }
  }

  Stop () {
    debug('Stop called')

    if (this.browser && this.eventEmitter && this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onstop') {
      return this._takeScreenshot()
        .then((screenshot) => {
          this.eventEmitter.emit('MESSAGE_ATTACHMENT', this.container, screenshot)
        })
        .then(() => this._stopBrowser())
    } else {
      return this._stopBrowser()
    }
  }

  Clean () {
    debug('Clean called')
    return this._stopBrowser().then(() => {
      if (this.phantomJSProcess) {
        debug(`Killing phantomJS process ${this.phantomJSProcess.pid}`)
        process.kill(this.phantomJSProcess.pid)
        this.phantomJSProcess = null
      }
      if (this.seleniumChild) {
        debug(`Killing selenium process`)
        this.seleniumChild.kill()
        this.seleniumChild = null
      }
    })
  }

  _stopBrowser () {
    if (this.cancelReceive) {
      this.cancelReceive()
    }
    if (this.browser) {
      return this.browser.end()
        .then(() => this.browser.pause(2000))
        .then(() => { this.browser = null })
        .catch((err) => {
          debug(`WARNING: browser.end failed - ${util.inspect(err)}`)
          this.browser = null
        })
    }
    return Promise.resolve()
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

  _takeScreenshot () {
    return this.browser.saveScreenshot()
      .then((buffer) => {
        debug(`Screenshot taken, size ${buffer.length}`)
        return {
          base64: buffer.toString('base64'),
          mimeType: 'image/png'
        }
      })
      .catch((err) => {
        const errMsg = `Failed to take screenshot: ${util.inspect(err)}`
        debug(errMsg)
        throw new Error(errMsg)
      })
  }

  _saveDebugScreenshot (section) {
    this.browser.saveScreenshot()
      .then((buffer) => {
        fs.writeFile(section + '.png', buffer, (fsErr) => {
          if (fsErr) debug('Error saving screenshot', fsErr)
          else debug('Saved debugging screenshot', section)
        })
      })
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorWebdriverIO
}
