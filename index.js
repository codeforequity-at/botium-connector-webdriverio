const util = require('util')
const vm = require('vm')
const fs = require('fs')
const path = require('path')
const async = require('async')
const webdriverio = require('webdriverio')
const phantomjs = require('phantomjs-prebuilt')
const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio')

const messengerComProfile = require('./profiles/messenger_com')
const dialogflowComProfile = require('./profiles/dialogflow_com')
const botbuilderWebchatProfile = require('./profiles/botbuilder_webchat')

const profiles = {
  'messenger_com': messengerComProfile,
  'dialogflow_com': dialogflowComProfile,
  'botbuilder_webchat': botbuilderWebchatProfile
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
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT',
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: 'WEBDRIVERIO_IGNOREUPFRONTMESSAGES',
  WEBDRIVERIO_IGNOREWELCOMEMESSAGES: 'WEBDRIVERIO_IGNOREWELCOMEMESSAGES',
  WEBDRIVERIO_USERNAME: 'WEBDRIVERIO_USERNAME',
  WEBDRIVERIO_PASSWORD: 'WEBDRIVERIO_PASSWORD',
  WEBDRIVERIO_SCREENSHOTS: 'WEBDRIVERIO_SCREENSHOTS',
  WEBDRIVERIO_VIEWPORT_SIZE: 'WEBDRIVERIO_VIEWPORT_SIZE',
  WEBDRIVERIO_START_PHANTOMJS: 'WEBDRIVERIO_START_PHANTOMJS'
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

  if (msg.sourceData && msg.sourceData.quickReply) {
    const qrSelector = `button[title*='${msg.sourceData.quickReply}']:not(:disabled)`
    return browser
      .waitForVisible(qrSelector, inputElementVisibleTimeout)
      .click(qrSelector)
  }
  return browser
    .waitForEnabled(inputElement, inputElementVisibleTimeout)
    .setValue(inputElement, msg.messageText)
    .keys('Enter')
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
      debug(`polling for bot output (${outputElement})`)
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
          for (let i = currentCount; i < r.value.length; i++) {
            elementsPromise = elementsPromise.then(() => {
              debug(`Found new bot response element ${outputElement}, id ${r.value[i].ELEMENT}`)
              return container.getBotMessage(container, browser, r.value[i].ELEMENT)
            })
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

const getBotMessageDefault = (container, browser, elementId) => {
  debug(`getBotMessageDefault receiving text for element ${elementId}`)

  return browser.elementIdText(elementId).then((elementValue) => {
    const botMsg = { sender: 'bot', sourceData: { elementValue, elementId }, messageText: elementValue.value }
    return container.BotSays(botMsg)
  })
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

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES]) this.ignoreBotMessages = true
    else this.ignoreBotMessages = false

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]) {
      if (!_.isNumber(this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES])) throw new Error('WEBDRIVERIO_IGNOREWELCOMEMESSAGES capability requires a number')
      this.ignoreWelcomeMessages = this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]
    } else this.ignoreWelcomeMessages = 0

    if (this.ignoreBotMessages && this.ignoreWelcomeMessages > 0) throw new Error('WEBDRIVERIO_IGNOREUPFRONTMESSAGES and WEBDRIVERIO_IGNOREWELCOMEMESSAGES are invalid in combination')

    if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] && ['none', 'onbotsays', 'onstop'].indexOf(this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS]) < 0) throw new Error('WEBDRIVERIO_SCREENSHOTS not in "none"/"onbotsays"/"onstop"')

    this.startPhantomJS = this.caps[Capabilities.WEBDRIVERIO_START_PHANTOMJS]

    return Promise.resolve()
  }

  Build () {
    debug('Build called')
    if (this.startPhantomJS) {
      debug('Starting phantomJS!')
      return phantomjs.run('--webdriver=4444').then(program => {
        this.phantomJSProcess = program
      })
    } else {
      return Promise.resolve()
    }
  }

  Start () {
    debug('Start called')

    this.ignoreWelcomeMessageCounter = this.ignoreWelcomeMessages

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
      debug(`BotSays called ${util.inspect(msg)}`)

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
    })
  }

  _stopBrowser () {
    if (this.cancelReceive) {
      this.cancelReceive()
    }
    if (this.browser) {
      return this.browser.end()
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

      debug(`Capability ${capName} not a function, trying to load as function from NPM package`)
      try {
        const c = require(this.caps[capName])
        if (_.isFunction(c)) return c
      } catch (err) {
      }

      const tryLoadFile = path.resolve(process.cwd(), this.caps[capName])
      debug(`Capability ${capName} failed loading as function from NPM package, trying as function from file ${tryLoadFile}`)
      try {
        const c = require(tryLoadFile)
        if (_.isFunction(c)) return c
      } catch (err) {
      }

      debug(`Capability ${capName} failed loading as function from file , trying as function code`)
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
