const util = require('util')
const path = require('path')
const fs = require('fs')
const mime = require('mime-types')
const webdriverio = require('webdriverio')
const { UNICODE_CHARACTERS } = require('@wdio/utils')
const pretty = require('pretty')
const Mustache = require('mustache')
const crypto = require('crypto')
const Queue = require('better-queue')
const chromedriver = require('chromedriver')
const selenium = require('selenium-standalone')
const _ = require('lodash')
const xpath = require('xpath')
const { DOMParser } = require('xmldom')
const debug = require('debug')('botium-connector-webdriverio')

const { HookUtils } = require('botium-core')

const dialogflowComProfile = require('./profiles/dialogflow_com')
const dialogflowcxMessengerProfile = require('./profiles/dialogflowcx_messenger')
const botbuilderWebchatV3Profile = require('./profiles/botbuilder_webchat_v3')
const botbuilderWebchatV4Profile = require('./profiles/botbuilder_webchat_v4')
const botbuilderWebchatV41Profile = require('./profiles/botbuilder_webchat_v4_10_0')
const watsonpreviewProfile = require('./profiles/watsonpreview')
const whatsappProfile = require('./profiles/whatsapp')

const profiles = {
  dialogflow_com: dialogflowComProfile,
  dialogflowcx_messenger: dialogflowcxMessengerProfile,
  botbuilder_webchat_v3: botbuilderWebchatV3Profile,
  botbuilder_webchat_v4: botbuilderWebchatV4Profile,
  botbuilder_webchat_v4_10_0: botbuilderWebchatV41Profile,
  watsonpreview: watsonpreviewProfile,
  whatsapp: whatsappProfile
}

const Capabilities = {
  WEBDRIVERIO_OPTIONS: 'WEBDRIVERIO_OPTIONS',
  WEBDRIVERIO_ADDITIONAL_CAPABILITIES: 'WEBDRIVERIO_ADDITIONAL_CAPABILITIES',
  WEBDRIVERIO_URL: 'WEBDRIVERIO_URL',
  WEBDRIVERIO_APP: 'WEBDRIVERIO_APP',
  WEBDRIVERIO_APPPACKAGE: 'WEBDRIVERIO_APPPACKAGE',
  WEBDRIVERIO_APPACTIVITY: 'WEBDRIVERIO_APPACTIVITY',
  WEBDRIVERIO_APPNORESET: 'WEBDRIVERIO_APPNORESET',
  WEBDRIVERIO_USE_APPIUM_PREFIX: 'WEBDRIVERIO_USE_APPIUM_PREFIX',
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
  WEBDRIVERIO_IMPLICIT_TIMEOUT: 'WEBDRIVERIO_IMPLICIT_TIMEOUT',
  WEBDRIVERIO_INPUT_NAVIGATION_BUTTONS: 'WEBDRIVERIO_INPUT_NAVIGATION_BUTTONS',
  WEBDRIVERIO_INPUT_ELEMENT: 'WEBDRIVERIO_INPUT_ELEMENT',
  WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT: 'WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT',
  WEBDRIVERIO_INPUT_ELEMENT_SKIP_WAITFORDISPLAYED: 'WEBDRIVERIO_INPUT_ELEMENT_SKIP_WAITFORDISPLAYED',
  WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON',
  WEBDRIVERIO_INPUT_ELEMENT_BUTTON: 'WEBDRIVERIO_INPUT_ELEMENT_BUTTON',
  WEBDRIVERIO_INPUTPAUSE: 'WEBDRIVERIO_INPUTPAUSE',
  WEBDRIVERIO_OUTPUT_XPATH: 'WEBDRIVERIO_OUTPUT_XPATH',
  WEBDRIVERIO_OUTPUT_ELEMENT: 'WEBDRIVERIO_OUTPUT_ELEMENT',
  WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_SELECTOR: 'WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_SELECTOR',
  WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ATTRIBUTE: 'WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ATTRIBUTE',
  WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ORDER: 'WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ORDER',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_PAUSE: 'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_PAUSE',
  WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS_PAUSE: 'WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS_PAUSE',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_PAUSE: 'WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_PAUSE',
  WEBDRIVERIO_OUTPUT_ELEMENT_FORMS: 'WEBDRIVERIO_OUTPUT_ELEMENT_FORMS',
  WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_NESTED: 'WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_NESTED',
  WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_PAUSE: 'WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_PAUSE',
  WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_OPTIONTEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_OPTIONTEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_KEY_ATTRIBUTE: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_KEY_ATTRIBUTE',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_PAUSE: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_PAUSE',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_TEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_SUBTEXT: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_SUBTEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_MEDIA: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_MEDIA',
  WEBDRIVERIO_OUTPUT_ELEMENT_CARD_BUTTONS: 'WEBDRIVERIO_OUTPUT_ELEMENT_CARD_BUTTONS',
  WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML: 'WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE: 'WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE',
  WEBDRIVERIO_SKIP_WAITFORCLICKABLE: 'WEBDRIVERIO_SKIP_WAITFORCLICKABLE',
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: 'WEBDRIVERIO_IGNOREUPFRONTMESSAGES',
  WEBDRIVERIO_IGNOREWELCOMEMESSAGES: 'WEBDRIVERIO_IGNOREWELCOMEMESSAGES',
  WEBDRIVERIO_IGNOREEMPTYMESSAGES: 'WEBDRIVERIO_IGNOREEMPTYMESSAGES',
  WEBDRIVERIO_USERNAME: 'WEBDRIVERIO_USERNAME',
  WEBDRIVERIO_PASSWORD: 'WEBDRIVERIO_PASSWORD',
  WEBDRIVERIO_CONTACT: 'WEBDRIVERIO_CONTACT',
  WEBDRIVERIO_LANGUAGE: 'WEBDRIVERIO_LANGUAGE',
  WEBDRIVERIO_SCREENSHOTS: 'WEBDRIVERIO_SCREENSHOTS',
  WEBDRIVERIO_VIEWPORT_SIZE: 'WEBDRIVERIO_VIEWPORT_SIZE',
  WEBDRIVERIO_SELENIUM_DEBUG: 'WEBDRIVERIO_SELENIUM_DEBUG',
  WEBDRIVERIO_SCREENSHOTS_DEBUG: 'WEBDRIVERIO_SCREENSHOTS_DEBUG',
  WEBDRIVERIO_START_SELENIUM: 'WEBDRIVERIO_START_SELENIUM',
  WEBDRIVERIO_START_SELENIUM_OPTS: 'WEBDRIVERIO_START_SELENIUM_OPTS',
  WEBDRIVERIO_START_CHROMEDRIVER: 'WEBDRIVERIO_START_CHROMEDRIVER',
  WEBDRIVERIO_START_CHROMEDRIVER_ARGS: 'WEBDRIVERIO_START_CHROMEDRIVER_ARGS',
  WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_ARGS: 'WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_ARGS',
  WEBDRIVERIO_START_CHROMEDRIVER_OPTIONS: 'WEBDRIVERIO_START_CHROMEDRIVER_OPTIONS',
  WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_OPTIONS: 'WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_OPTIONS'
}

const openBrowserDefault = async (container, browser) => {
  const url = container.caps[Capabilities.WEBDRIVERIO_URL]
  if (!url) return

  await browser.url(url)
  const title = await browser.getTitle()
  debug(`URL ${url} opened, page title: ${title}`)
  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
    const html = await browser.execute('return document.documentElement.outerHTML;')
    debug(html)
  }
  if (container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE]) {
    await browser.setWindowSize(container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE].width, container.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE].height)
  }

  try {
    await browser.execute('window.localStorage.clear();')
    debug(`URL ${url} opened, deleted local storage`)
  } catch (err) {
    debug(`openBrowser failed to delete local storage: ${err.message || err}`)
  }
  try {
    await browser.execute('window.sessionStorage.clear();')
    debug(`URL ${url} opened, deleted session storage`)
  } catch (err) {
    debug(`openBrowser failed to delete session storage: ${err.message || err}`)
  }
}

const openBotDefault = async (container, browser) => {
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000

  if (container.caps[Capabilities.WEBDRIVERIO_INPUT_NAVIGATION_BUTTONS]) {
    await container.clickSeries(container.caps[Capabilities.WEBDRIVERIO_INPUT_NAVIGATION_BUTTONS], { timeout: inputElementVisibleTimeout })
  }

  const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
  if (inputElementSelector && !container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_SKIP_WAITFORDISPLAYED]) {
    const inputElement = await container.findElement(inputElementSelector)
    await inputElement.waitForDisplayed({ timeout: inputElementVisibleTimeout })
    debug(`Input element ${inputElementSelector} is visible`)
  }
}

const convertToSetValue = (str, includeEnter = false) => {
  let result = str || ''
  if (includeEnter) result = result + UNICODE_CHARACTERS.Enter
  return result
}

const LOWERCASE = (element = '.') => `translate(${element}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ','abcdefghijklmnopqrstuvwxyzäöü')`
const CONTAINS_PREPARE = (text) => text ? text.indexOf('\'') < 0 ? `'${text}'` : `concat('${text.replace(/'/g, '\',"\'",\'')}')` : '\'\''

const sendToBotDefault = async (container, browser, msg) => {
  const inputElementVisibleTimeout = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT] || 10000

  if (msg.forms && msg.forms.length > 0) {
    for (const form of msg.forms) {
      if (!form.value || !form.name) continue

      let formElementSelector = null
      let formElement = null
      if (container.formElementsById[form.name]) {
        formElement = container.formElementsById[form.name]
      } else if (container.formElementsByName[form.name]) {
        formElement = container.formElementsByName[form.name]
      } else if (form.name.startsWith('//')) {
        formElementSelector = form.name
      } else {
        formElementSelector = `//*[@id='#${form.name}'][last()] | //*[@name='${form.name}'][last()]`
      }
      if (formElementSelector) {
        debug(`Using form element: ${formElementSelector}`)
        formElement = await container.findElement(formElementSelector)
      } else if (formElement) {
        debug(`Using form element: ${formElement.ELEMENT || formElement.elementId}`)
        formElement = await container.findElement(formElement)
      }
      const formTagName = await formElement.getTagName()

      if (formTagName && formTagName === 'select') {
        if (`${form.value}`.startsWith('INDEX:')) {
          const index = `${form.value}`.substr('INDEX:'.length)
          debug(`Setting select element option for ${form.name}: index "${index}"`)
          await formElement.selectByIndex(index)
        } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_OPTIONTEXT]) {
          debug(`Setting select element option for ${form.name}: text "${form.value}"`)
          await formElement.selectByVisibleText(form.value)
        } else {
          debug(`Setting select element option for ${form.name}: value "${form.value}"`)
          await formElement.selectByAttribute('value', form.value)
        }
      } else {
        const formType = await formElement.getAttribute('type')
        if (formType === 'checkbox') {
          const isSelected = await formElement.isSelected()
          const shouldBeSelected = form.value === 'true' || form.value === 'checked'
          if (isSelected !== shouldBeSelected) {
            debug(`Clicking on checkbox ${form.name} to change state to: ${form.value}`)
            await formElement.click()
          } else {
            debug(`Not clicking on checkbox ${form.name}, state already: ${form.value}`)
          }
        } else if (formType === 'radio') {
          if (container.formElementsByValue[form.name] && container.formElementsByValue[form.name][form.value]) {
            debug(`Clicking on radio button ${form.name} to change state to: ${form.value}`)
            const radioElementByValue = container.formElementsByValue[form.name][form.value]
            radioElementByValue.click()
          } else if (form.value === 'true' || form.value === 'checked') {
            debug(`Clicking on radio button ${form.name} to change state to: ${form.value}`)
            await formElement.click()
          } else {
            debug(`Not clicking any radio button ${form.name} to change state to: ${form.value} - only setting to "true" possible`)
          }
        } else {
          debug(`Setting input element value for ${form.name}: ${form.value}`)
          await formElement.setValue(convertToSetValue(form.value), { translateToUnicode: false })
        }
      }
    }
  }
  if (msg.buttons && msg.buttons.length > 0) {
    const qrView = {
      button: {
        text: msg.buttons[0].text || msg.buttons[0].payload,
        payload: msg.buttons[0].payload || msg.buttons[0].text
      }
    }
    qrView.button.textlower = qrView.button.text && qrView.button.text.toLowerCase()
    qrView.button.payloadlower = qrView.button.payload && qrView.button.payload.toLowerCase()
    qrView.button.textlowerconcat = qrView.button.textlower && CONTAINS_PREPARE(qrView.button.textlower)
    qrView.button.payloadlowerconcat = qrView.button.payloadlower && CONTAINS_PREPARE(qrView.button.payloadlower)

    let qrSelector = null
    let qrElement = null
    if (qrView.button.payload && qrView.button.payload.toLowerCase().startsWith('click:')) {
      qrSelector = qrView.button.payload.substring(6)
    } else if (container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_BUTTON]) {
      qrSelector = Mustache.render(container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_BUTTON], qrView)
    } else if (qrView.button.payload && container.buttonElementsByPayload[qrView.button.payload]) {
      qrElement = container.buttonElementsByPayload[qrView.button.payload]
    } else if (qrView.button.text && container.buttonElementsByText[qrView.button.text]) {
      qrElement = container.buttonElementsByText[qrView.button.text]
    } else {
      qrSelector = Mustache.render(`//button[contains(${LOWERCASE('.')},{{button.textlowerconcat}})][last()] | //a[contains(${LOWERCASE('.')},{{button.textlowerconcat}})][last()] | //*[@role="button" and contains(${LOWERCASE('.')},{{button.textlowerconcat}})][last()]`, qrView)
    }
    if (qrSelector) {
      debug(`Waiting for button element to be visible: ${qrSelector}`)
      await container.waitAndClickOn(qrSelector, { timeout: inputElementVisibleTimeout })
      debug(`simulated click on button ${qrSelector}`)
    } else if (qrElement) {
      debug(`Clicking on button element: ${qrElement.ELEMENT || qrElement.elementId}`)
      await (await container.findElement(qrElement)).click()
      debug(`simulated click on button element ${qrElement.ELEMENT || qrElement.elementId}`)
    }
  } else {
    const inputElementSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT]
    if (!inputElementSelector) {
      throw new Error(`Trying to send text "${msg.messageText}", but no input element configured.`)
    }

    const inputElementSendButtonSelector = container.caps[Capabilities.WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON]

    const inputElement = await container.findElement(inputElementSelector)
    await inputElement.waitForEnabled({ timeout: inputElementVisibleTimeout })
    if (inputElementSendButtonSelector) {
      debug(`input element ${inputElementSelector} is visible, simulating input: "${msg.messageText}" (with Send button ${inputElementSendButtonSelector})`)
      await inputElement.setValue(convertToSetValue(msg.messageText), { translateToUnicode: false })
      await container.waitAndClickOn(inputElementSendButtonSelector, { timeout: inputElementVisibleTimeout })
      debug(`simulated click on input button ${inputElementSendButtonSelector}`)
    } else {
      debug(`input element ${inputElementSelector} is visible, simulating input: "${msg.messageText}" (with Enter key)`)
      await inputElement.setValue(convertToSetValue(msg.messageText, true), { translateToUnicode: false })
    }
  }
}

const receiveFromBotDefault = async (container, browser) => {
  let r = null
  if (container.useXpath()) {
    const xml = await browser.getPageSource()
    const doc = new DOMParser().parseFromString(xml)

    const xResultToAppium = (s) => ({
      getText: () => s.getAttribute('text'),
      getAttribute: (name) => s.getAttribute(name),
      $: (sel) => {
        const singleResult = xpath.select(sel, s, true)
        if (singleResult) return xResultToAppium(singleResult)
        else return null
      },
      $$: (sel) => xpath.select(sel, s, false).map(m => xResultToAppium(m))
    })
    r = xpath.select(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT], doc, false).map(s => xResultToAppium(s))
  } else {
    const outputElement = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT]
    r = await container.findElements(outputElement)
  }
  const orderSel = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_SELECTOR]
  const orderAttr = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ATTRIBUTE]
  const orderOrder = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_ORDER_ORDER] || 'asc'
  if (orderSel || orderAttr) {
    const orderVals = []
    for (const element of r) {
      const orderElement = orderSel ? await element.$(orderSel) : element
      const orderVal = orderAttr ? await orderElement.getAttribute(orderAttr) : await _getTextFromElement(container, browser, orderElement)
      orderVals.push(orderVal)
    }
    return _.chain(r).map((e, i) => ({ e, i })).orderBy([s => orderVals[s.i]], [orderOrder]).value().map(e => e.e)
  } else {
    return r
  }
}

const _isNested = (container, capName, def) => {
  if (!Object.prototype.hasOwnProperty.call(container.caps, capName)) return def
  return !!container.caps[capName]
}
const cleanText = (text) => _.isString(text) ? text.trim().split('\n').join(' ').split('\\n').join(' ') : ''

const _getTextFromElement = async (container, browser, element) => {
  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]) {
    const trySelectors = _.isArray(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]) ? container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT] : [container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT]]

    if (_isNested(container, Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED, true)) {
      for (const sel of trySelectors) {
        try {
          const textElements = (await element.$$(sel)).filter(t => t.elementId)
          if (textElements && textElements.length > 0) {
            const result = []
            for (const textElement of textElements) {
              result.push(cleanText(await textElement.getText()))
            }
            return result.join(' ')
          }
        } catch (err) {
          debug('_getTextFromElement textElement.getText failed', err.message)
        }
      }
    } else {
      for (const sel of trySelectors) {
        try {
          const textElements = (await container.findElements(sel)).filter(t => t.elementId)
          if (textElements && textElements.length > 0) {
            const result = []
            for (const textElement of textElements) {
              result.push(cleanText(await textElement.getText()))
            }
            return result.join(' ')
          }
        } catch (err) {
          debug('_getTextFromElement textElement.getText failed', err.message)
        }
      }
    }
  } else {
    return cleanText(await element.getText())
  }
}
const _getButtonFromElement = async (container, browser, buttonElement) => {
  if (buttonElement) {
    const buttonElementText = cleanText(await buttonElement.getText())
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
      if (button.text) container.buttonElementsByText[button.text] = buttonElement
      if (button.payload && _.isString(button.payload)) container.buttonElementsByPayload[button.payload] = buttonElement
      return button
    }
  }
}

const _getMediaFromElement = async (container, browser, mediaElement) => {
  if (mediaElement) {
    const mediaSrcValue = await mediaElement.getAttribute('src')
    if (mediaSrcValue) {
      const mediaAltValue = cleanText(await mediaElement.getAttribute('alt'))
      const result = {
        mediaUri: mediaSrcValue,
        altText: mediaAltValue
      }
      if (_.isString(mediaSrcValue) && mediaSrcValue.startsWith('data:')) {
        const parts = mediaSrcValue.split(':', 2)
        if (parts.length > 1) {
          result.mimeType = parts[1]
        }
      } else {
        result.mimeType = mime.lookup(mediaSrcValue) || 'application/unknown'
      }
      return result
    }
  }
}

const _getFormFromElement = async (container, browser, formElement, forms = []) => {
  if (formElement) {
    const formTagName = await formElement.getTagName()
    const formId = await formElement.getAttribute('id')
    const formName = await formElement.getAttribute('name')
    const formType = await formElement.getAttribute('type')

    if (formId) container.formElementsById[formId] = formElement
    if (formName) container.formElementsByName[formName] = formElement

    if (formTagName && (formId || formName) && formTagName === 'select') {
      const result = {
        name: formId || formName,
        label: formName || formId,
        type: 'ChoiceSet',
        options: []
      }
      const optionElements = await formElement.$$('option')
      for (const [optionIndex, optionElement] of (optionElements || []).entries()) {
        const optionName = cleanText(await optionElement.getText())
        const optionSelected = await optionElement.getAttribute('selected')

        if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_OPTIONTEXT]) {
          result.options.push({ title: optionName, value: optionName })
          if (optionSelected) result.value = optionName
        } else {
          result.options.push({ title: optionName, value: `INDEX:${optionIndex}` })
          if (optionSelected) result.value = `INDEX:${optionIndex}`
        }
      }
      return result
    } else if (formTagName && formTagName === 'input' && formType === 'checkbox') {
      const checked = await formElement.getAttribute('checked')

      return {
        name: formId || formName,
        label: formName || formId,
        type: 'Toggle',
        value: checked ? 'true' : 'false'
      }
    } else if (formTagName && formTagName === 'input' && formType === 'radio') {
      const formValue = await formElement.getAttribute('value')
      const checked = await formElement.getAttribute('checked')

      container.formElementsByValue[formName] = {
        ...(container.formElementsByValue[formName] || {}),
        [formValue]: formElement
      }
      const r = forms.find(f => f.type === 'RadioSet' && f.name === formName)
      if (r) {
        if (checked) {
          r.value = formValue
        }
        r.options.push({ title: formId, value: formValue })
      } else {
        return {
          name: formName,
          label: formName,
          type: 'RadioSet',
          options: [{ title: formId, value: formValue }],
          value: checked ? formValue : null
        }
      }
    } else {
      const formValue = await formElement.getAttribute('value')
      return {
        name: formId || formName,
        label: formName || formId,
        type: 'Text',
        value: formValue
      }
    }
  }
}

const urlRegexp = /(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?/
const getBotMessageDefault = async (container, browser, element, html) => {
  debug(`getBotMessageDefault receiving text for element ${element.ELEMENT || element.elementId}`)

  const botMsg = { sender: 'bot', sourceData: { elementId: element.ELEMENT || element.elementId, html } }
  botMsg.messageText = await _getTextFromElement(container, browser, element)

  if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD]) {
    if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_PAUSE]) {
      await browser.pause(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_PAUSE])
    }
    const cardElements = await element.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD])
    for (const cardElement of (cardElements || [])) {
      const card = {}

      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_TEXT]) {
        try {
          card.text = cleanText(await cardElement.$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_TEXT]).getText())
        } catch (err) {
        }
      } else {
        card.text = cleanText(await cardElement.getText())
      }
      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_SUBTEXT]) {
        try {
          card.subtext = cleanText(await cardElement.$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_SUBTEXT]).getText())
        } catch (err) {
        }
      }
      let cardKey = null
      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_KEY_ATTRIBUTE]) {
        cardKey = await cardElement.getAttribute(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_KEY_ATTRIBUTE])
      }
      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_BUTTONS]) {
        const buttonElements = await cardElement.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_BUTTONS])
        for (const buttonElement of (buttonElements || [])) {
          const button = await _getButtonFromElement(container, browser, buttonElement)
          if (button) {
            if (!button.payload && cardKey) {
              button.payload = `click://*[@${container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_KEY_ATTRIBUTE]}='${cardKey}']//button[contains(., ${CONTAINS_PREPARE(button.text)})][last()]`
            }
            card.buttons = card.buttons || []
            card.buttons.push(button)
          }
        }
      }
      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_MEDIA]) {
        const mediaElements = await cardElement.$$(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD_MEDIA])
        for (const mediaElement of (mediaElements || [])) {
          const media = await _getMediaFromElement(container, browser, mediaElement)
          if (media) {
            card.media = card.media || []
            card.media.push(media)
          }
        }
      }
      botMsg.cards = botMsg.cards || []
      botMsg.cards.push(card)
    }
  }

  let buttonsSelector = './/button | .//a[@href] | .//*[@role="button"]'
  if (_.isBoolean(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS]) && !container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS]) {
    buttonsSelector = null
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS]) {
    buttonsSelector = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS]
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD] && botMsg.cards && botMsg.cards.length > 0) {
    buttonsSelector = null
  }
  if (buttonsSelector) {
    if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_PAUSE]) {
      await browser.pause(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_PAUSE])
    }
    let buttonElements
    if (_isNested(container, Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED, true)) {
      buttonElements = await element.$$(buttonsSelector)
    } else {
      buttonElements = await container.findElements(buttonsSelector)
    }

    if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS]) {
      if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS_PAUSE]) {
        await browser.pause(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS_PAUSE])
      }
      const extraButtonElements = await container.findElements(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS])
      if (extraButtonElements) {
        buttonElements = (buttonElements || []).concat(extraButtonElements)
      }
    }

    for (const buttonElement of (buttonElements || [])) {
      const button = await _getButtonFromElement(container, browser, buttonElement)
      if (button) {
        botMsg.buttons = botMsg.buttons || []
        botMsg.buttons.push(button)
      }
    }
  }

  let mediaSelector = './/img | .//video | .//audio'
  if (_.isBoolean(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA]) && !container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA]) {
    mediaSelector = null
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA]) {
    mediaSelector = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA]
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD] && botMsg.cards && botMsg.cards.length > 0) {
    mediaSelector = null
  }
  if (mediaSelector) {
    if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_PAUSE]) {
      await browser.pause(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_PAUSE])
    }

    let mediaElements
    if (_isNested(container, Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED, true)) {
      mediaElements = await element.$$(mediaSelector)
    } else {
      mediaElements = await container.findElements(mediaSelector)
    }
    for (const mediaElement of (mediaElements || [])) {
      const media = await _getMediaFromElement(container, browser, mediaElement)
      if (media) {
        botMsg.media = botMsg.media || []
        botMsg.media.push(media)
      }
    }
  }

  let formsSelector = './/select | .//input | .//textarea'
  if (_.isBoolean(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS]) && !container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS]) {
    formsSelector = null
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS]) {
    formsSelector = container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS]
  } else if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_CARD] && botMsg.cards && botMsg.cards.length > 0) {
    formsSelector = null
  }
  if (formsSelector) {
    if (container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_PAUSE]) {
      await browser.pause(container.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_PAUSE])
    }
    let formElements
    if (_isNested(container, Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_FORMS_NESTED, true)) {
      formElements = await element.$$(formsSelector)
    } else {
      formElements = await container.findElements(formsSelector)
    }
    for (const formElement of (formElements || [])) {
      const form = await _getFormFromElement(container, browser, formElement, botMsg.forms)
      if (form) {
        botMsg.forms = botMsg.forms || []
        botMsg.forms.push(form)
      }
    }
  }

  if (botMsg.messageText || (botMsg.buttons && botMsg.buttons.length > 0) || (botMsg.media && botMsg.media.length > 0) || (botMsg.cards && botMsg.cards.length > 0) || (botMsg.forms && botMsg.forms.length > 0) || !container.caps[Capabilities.WEBDRIVERIO_IGNOREEMPTYMESSAGES]) return container.BotSays(botMsg)
  else debug(`getBotMessageDefault ignoring empty element ${element.ELEMENT || element.elementId}`)
}

class BotiumConnectorWebdriverIO {
  constructor ({ container, queueBotSays, eventEmitter, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.eventEmitter = eventEmitter
    this.caps = caps
    this.handledElement = []
    this.buttonElementsByText = {}
    this.buttonElementsByPayload = {}
    this.formElementsByName = {}
    this.formElementsByValue = {}
    this.formElementsById = {}
    this.screenshotCounterBySection = {}
    this.sourceCounterBySection = {}
    this.appiumContext = null
  }

  isAppium () {
    return !!(this.caps[Capabilities.WEBDRIVERIO_APPPACKAGE])
  }

  isWeb () {
    return !this.isAppium() || (this.appiumContext && this.appiumContext.toLowerCase().startsWith('webview'))
  }

  useXpath () {
    if (this.isWeb()) return false
    return !!(this.caps[Capabilities.WEBDRIVERIO_OUTPUT_XPATH])
  }

  async waitAndClickOn (clickElement, options = {}) {
    if (!this.browser) throw new Error('Connector not yet started')
    if (this.caps[Capabilities.WEBDRIVERIO_SKIP_WAITFORCLICKABLE]) {
      if (_.isString(clickElement)) {
        await (await this.findElement(clickElement)).click()
      } else {
        await clickElement.click()
      }
    } else {
      if (_.isString(clickElement)) {
        clickElement = await this.findElement(clickElement)
      }
      if (this.isAppium()) {
        await this.browser.waitUntil(async () => {
          if (!(await clickElement.isDisplayed())) return false
          if (!(await clickElement.isEnabled())) return false
          return true
        }, options)
      } else {
        await clickElement.waitForClickable(options)
      }
      if (!this.isAppium()) await clickElement.scrollIntoView()
      await clickElement.click()
    }
  }

  async clickSeries (clickSelectors, options) {
    if (!this.browser) throw new Error('Connector not yet started')
    if (!clickSelectors) return
    if (_.isString(clickSelectors)) {
      clickSelectors = [clickSelectors]
    }
    options = options || {}

    for (let [i, clickSelector] of clickSelectors.entries()) {
      let isOptional = false
      if (clickSelector.startsWith('?')) {
        isOptional = true
        clickSelector = clickSelector.substring(1)
      } else if (clickSelector.startsWith('!')) {
        isOptional = false
        clickSelector = clickSelector.substring(1)
      }

      try {
        if (clickSelector.toLowerCase().startsWith('pause:')) {
          debug(`clickSeries - pausing #${i + 1}: ${clickSelector}`)

          const pause = clickSelector.split(':', 2)[1]
          await this.browser.pause(pause)
        } else if (clickSelector.toLowerCase() === 'dumphtml') {
          debug(`clickSeries - dumping html #${i + 1}`)
          await this._dumpPageSource('clickSeries', true)
        } else if (clickSelector.toLowerCase().startsWith('iframe:')) {
          debug(`clickSeries - trying to switch to iframe #${i + 1}: ${clickSelector}`)

          const iframeSelector = clickSelector.split(':', 2)[1]
          if (iframeSelector === 'parent') {
            await this.browser.switchToParentFrame()
          } else {
            const iframeElement = await this.findElement(iframeSelector)
            await iframeElement.waitForDisplayed(options)
            try {
              await this.browser.switchToFrame(iframeElement)
            } catch (err) {
              await this.browser.switchToFrame(iframeElement.elementId)
            }
          }
          debug(`clickSeries - switched to iframe #${i + 1}: ${clickSelector}`)
        } else if (clickSelector.toLowerCase().startsWith('switch:')) {
          debug(`clickSeries - trying to switch to window/tab #${i + 1}: ${clickSelector}`)

          const switchSelector = clickSelector.split(':', 2)[1]
          await this.browser.switchWindow(switchSelector)
          debug(`clickSeries - switched to window/tab #${i + 1}: ${clickSelector}`)
        } else if (clickSelector.toLowerCase().startsWith('setvalue:') || clickSelector.toLowerCase().startsWith('sendkeys:') || clickSelector.toLowerCase().startsWith('addvalue:')) {
          const parts = clickSelector.split(':', 3)
          const action = parts[0].toLowerCase()
          const value = parts[1]
          const inputElementSelector = parts[2]

          if (action === 'setvalue') {
            debug(`clickSeries - trying to set value ${value} #${i + 1}: ${inputElementSelector}`)
            const inputElement = await this.findElement(inputElementSelector)
            if (value === 'Enter') {
              await inputElement.setValue(convertToSetValue(null, true), { translateToUnicode: false })
            } else {
              await inputElement.setValue(convertToSetValue(value), { translateToUnicode: false })
            }
          } else if (action === 'sendkeys') {
            debug(`clickSeries - trying to send keys ${value} #${i + 1}: ${inputElementSelector}`)
            const inputElement = await this.findElement(inputElementSelector)
            if (value === 'Enter') {
              await inputElement.sendKeys(convertToSetValue(null, true), { translateToUnicode: false })
            } else {
              await inputElement.sendKeys(convertToSetValue(value), { translateToUnicode: false })
            }
          } else if (action === 'addvalue') {
            debug(`clickSeries - trying to add value ${value} #${i + 1}: ${inputElementSelector}`)
            const inputElement = await this.findElement(inputElementSelector)
            if (value === 'Enter') {
              await inputElement.addValue(convertToSetValue(null, true), { translateToUnicode: false })
            } else {
              await inputElement.addValue(convertToSetValue(value), { translateToUnicode: false })
            }
          }
        } else if (clickSelector.toLowerCase().startsWith('selectbyvalue:') || clickSelector.toLowerCase().startsWith('selectbyname:') || clickSelector.toLowerCase().startsWith('selectbytext:') || clickSelector.toLowerCase().startsWith('selectbyindex:')) {
          const parts = clickSelector.split(':', 3)
          const action = parts[0].toLowerCase()
          const value = parts[1]
          const inputElementSelector = parts[2]

          debug(`clickSeries - trying to ${action} ${value} #${i + 1}: ${inputElementSelector}`)
          const inputElement = await this.findElement(inputElementSelector)

          if (action === 'selectbyvalue') {
            await inputElement.selectByAttribute('value', value)
          } else if (action === 'selectbyname') {
            await inputElement.selectByAttribute('name', value)
          } else if (action === 'selectbytext') {
            await inputElement.selectByVisibleText(value)
          } else if (action === 'selectbyindex') {
            await inputElement.selectByIndex(value)
          }
        } else if (clickSelector.toLowerCase().startsWith('context:')) {
          let context = clickSelector.split(':', 2)[1]
          debug(`clickSeries - waiting for context #${i + 1} matching: ${context}`)
          await this.browser.waitUntil(async () => {
            const contexts = await this.browser.getContexts()
            const matchingContext = contexts.find(c => c.toLowerCase().includes(context.toLowerCase()))
            if (matchingContext) {
              context = matchingContext
              return true
            }
            return false
          }, { timeout: options.timeout, timeoutMsg: `Context ${context} not available` })
          debug(`clickSeries - trying to switch context #${i + 1}: ${context}`)
          await this.browser.switchContext(context)
          this.appiumContext = context
          debug(`clickSeries - switched context #${i + 1}: ${context}`)
        } else if (clickSelector.toLowerCase().startsWith('waitForDisplayed:')) {
          debug(`clickSeries - waiting for an element to be visible #${i + 1}: ${clickSelector}`)

          const parts = clickSelector.split(':', 3)
          const inputElementSelector = parts[1]
          if (parts[2]) options.timeout = parts[2]

          const inputElement = await this.findElement(inputElementSelector)
          await inputElement.waitForDisplayed(options)
          debug(`clickSeries - element ${inputElementSelector} is visible`)
        } else if (clickSelector.toLowerCase().startsWith('waitForClickable:')) {
          debug(`clickSeries - waiting for an element to be clickable #${i + 1}: ${clickSelector}`)

          const parts = clickSelector.split(':', 3)
          const inputElementSelector = parts[1]
          if (parts[2]) options.timeout = parts[2]

          const inputElement = await this.findElement(inputElementSelector)
          await inputElement.waitForClickable(options)
          debug(`clickSeries - element ${inputElementSelector} is clickable`)
        } else if (clickSelector.toLowerCase().startsWith('waitForEnabled:')) {
          debug(`clickSeries - waiting for an element to be enabled #${i + 1}: ${clickSelector}`)

          const parts = clickSelector.split(':', 3)
          const inputElementSelector = parts[1]
          if (parts[2]) options.timeout = parts[2]

          const inputElement = await this.findElement(inputElementSelector)
          await inputElement.waitForEnabled(options)
          debug(`clickSeries - element ${inputElementSelector} is enabled`)
        } else {
          debug(`clickSeries - trying to click on element #${i + 1}: ${clickSelector}`)

          const parts = clickSelector.split(':', 3)
          const inputElementSelector = clickSelector.startsWith('click:') ? parts[1] : clickSelector
          if (parts[2]) options.timeout = parts[2]

          try {
            await this.waitAndClickOn(inputElementSelector, options)
            debug(`clickSeries - clicked on element #${i + 1}: ${inputElementSelector}`)
          } catch (err) {
            debug(`clickSeries - failed to click on element #${i + 1}: ${inputElementSelector}: ${err.message || err}`)
            throw err
          }
        }
        if (clickSelector.toLowerCase() !== 'dumphtml' && !clickSelector.toLowerCase().startsWith('pause:')) {
          await this._dumpPageSource('clickSeries')
        }
      } catch (err) {
        if (isOptional) {
          debug(`clickSeries - optional clickSelector failed #${i + 1}: ${clickSelector} - skipping it: ${err.message || err}`)
        } else {
          debug(`clickSeries - clickSelector failed #${i + 1}: ${clickSelector}: ${err.message || err}`)
          throw err
        }
      }
    }
  }

  async Validate () {
    debug('Validate called')

    if (this.caps[Capabilities.WEBDRIVERIO_PROFILE]) {
      const profile = profiles[this.caps[Capabilities.WEBDRIVERIO_PROFILE]]
      if (!profile) throw new Error('WEBDRIVERIO_PROFILE capability invalid')

      const cleanedProfile = _.omit(profile, Object.keys(this.caps))
      if (cleanedProfile.VALIDATE) {
        await cleanedProfile.VALIDATE(this)
        delete cleanedProfile.VALIDATE
      }
      this.caps = Object.assign(this.caps, cleanedProfile)
    }

    if (!this.caps[Capabilities.WEBDRIVERIO_OPTIONS] && !this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) throw new Error('WEBDRIVERIO_OPTIONS capability required (except when using WEBDRIVERIO_START_CHROMEDRIVER)')
    if (this.caps[Capabilities.WEBDRIVERIO_URL] && this.caps[Capabilities.WEBDRIVERIO_APPPACKAGE]) throw new Error('WEBDRIVERIO_URL or WEBDRIVERIO_APPPACKAGE capability cannot be used together')

    if (this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE] && _.isString(this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE])) {
      this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE] = JSON.parse(this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE])
    }
    if (this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE]) {
      if (!this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE].width || !this.caps[Capabilities.WEBDRIVERIO_VIEWPORT_SIZE].height) throw new Error('WEBDRIVERIO_VIEWPORT_SIZE capability requires width and height properties')
    }

    if (!_.has(this.caps, Capabilities.WEBDRIVERIO_OUTPUT_XPATH)) {
      this.caps[Capabilities.WEBDRIVERIO_OUTPUT_XPATH] = this.isAppium()
    }
    this.openBrowser = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBROWSER, openBrowserDefault)
    this.openBot = this._loadFunction(Capabilities.WEBDRIVERIO_OPENBOT, openBotDefault)
    this.sendToBot = this._loadFunction(Capabilities.WEBDRIVERIO_SENDTOBOT, sendToBotDefault)
    this.receiveFromBot = this._loadFunction(Capabilities.WEBDRIVERIO_RECEIVEFROMBOT, receiveFromBotDefault)
    this.getBotMessage = this._loadFunction(Capabilities.WEBDRIVERIO_GETBOTMESSAGE, getBotMessageDefault)

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES] && !_.isNumber(this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES])) throw new Error('WEBDRIVERIO_IGNOREWELCOMEMESSAGES capability requires a number')

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES] && this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES] > 0) throw new Error('WEBDRIVERIO_IGNOREUPFRONTMESSAGES and WEBDRIVERIO_IGNOREWELCOMEMESSAGES are invalid in combination')

    if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] && ['none', 'always', 'onbotsays', 'onstop'].indexOf(this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS]) < 0) throw new Error('WEBDRIVERIO_SCREENSHOTS not in "none"/"always"/"onbotsays"/"onstop"')

    if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER] && this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM]) {
      throw new Error('WEBDRIVERIO_START_CHROMEDRIVER and WEBDRIVERIO_START_SELENIUM are invalid in combination')
    }

    if (this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS] && _.isString(this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS])) {
      try {
        JSON.parse(this.caps[Capabilities.WEBDRIVERIO_START_SELENIUM_OPTS])
      } catch (err) {
        throw new Error(`WEBDRIVERIO_START_SELENIUM_OPTS JSON.parse failed: ${err.message || err}`)
      }
    }
  }

  async Build () {
    debug('Build called')

    if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) {
      this.chromePort = Math.floor(Math.random() * 10000 + 40000)
      const chromeArgs = this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ARGS] || [`--port=${this.chromePort}`, '--url-base=wd/hub']
      if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_ARGS]) {
        let addArgs = this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_ARGS]
        if (_.isString(addArgs)) {
          addArgs = addArgs.split(' ')
        }
        addArgs.forEach(a => chromeArgs.push(a))
      }
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
            reject(new Error(`Failed to start selenium: ${err.message || err}`))
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
    this.buttonElementsByText = {}
    this.buttonElementsByPayload = {}
    this.formElementsByName = {}
    this.formElementsByValue = {}
    this.formElementsById = {}

    if (this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]) {
      this.ignoreWelcomeMessageCounter = this.caps[Capabilities.WEBDRIVERIO_IGNOREWELCOMEMESSAGES]
    } else {
      this.ignoreWelcomeMessageCounter = 0
    }
    this.ignoreBotMessages = !!this.caps[Capabilities.WEBDRIVERIO_IGNOREUPFRONTMESSAGES]

    try {
      await this._stopBrowser()

      const options = this.caps[Capabilities.WEBDRIVERIO_OPTIONS] || {}
      options.capabilities = options.capabilities || {}
      if (this.caps[Capabilities.WEBDRIVERIO_ADDITIONAL_CAPABILITIES]) {
        const addCapsString = this.caps[Capabilities.WEBDRIVERIO_ADDITIONAL_CAPABILITIES]
        const addCaps = _.isString(addCapsString) ? JSON.parse(addCapsString) : addCapsString
        Object.assign(options.capabilities, addCaps)
      }
      if (!options.logLevel) {
        options.logLevel = this.caps[Capabilities.WEBDRIVERIO_SELENIUM_DEBUG] ? 'info' : 'silent'
      }

      if (this.caps[Capabilities.WEBDRIVERIO_APPPACKAGE]) {
        const prefix = this.caps[Capabilities.WEBDRIVERIO_USE_APPIUM_PREFIX] || ''
        options.capabilities[`${prefix}appPackage`] = this.caps[Capabilities.WEBDRIVERIO_APPPACKAGE]
        if (this.caps[Capabilities.WEBDRIVERIO_APPACTIVITY]) options.capabilities[`${prefix}appActivity`] = this.caps[Capabilities.WEBDRIVERIO_APPACTIVITY]
        if (this.caps[Capabilities.WEBDRIVERIO_APP]) options.capabilities[`${prefix}app`] = this.caps[Capabilities.WEBDRIVERIO_APP]
        if (_.has(this.caps, Capabilities.WEBDRIVERIO_APPNORESET)) options.capabilities[`${prefix}noReset`] = !!this.caps[Capabilities.WEBDRIVERIO_APPNORESET]
        if (!options.capabilities.noReset) options.capabilities[`${prefix}autoGrantPermissions`] = true
        if (!options.capabilities.automationName) options.capabilities[`${prefix}automationName`] = 'UiAutomator2'
      }

      if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER]) {
        const chromeOptionsArgs = this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_OPTIONS] || ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions']
        if (this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_OPTIONS]) {
          let addOptionsArgs = this.caps[Capabilities.WEBDRIVERIO_START_CHROMEDRIVER_ADDITIONAL_OPTIONS]
          if (_.isString(addOptionsArgs)) {
            addOptionsArgs = addOptionsArgs.split(' ')
          }
          addOptionsArgs.forEach(a => chromeOptionsArgs.push(a))
        }
        options.protocol = 'http'
        options.hostname = '127.0.0.1'
        options.port = this.chromePort
        options.path = '/wd/hub'
        options.capabilities = Object.assign({
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: chromeOptionsArgs
          }
        }, options.capabilities)
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
      if (this.caps[Capabilities.WEBDRIVERIO_IMPLICIT_TIMEOUT]) {
        await this.browser.setTimeout({
          implicit: this.caps[Capabilities.WEBDRIVERIO_IMPLICIT_TIMEOUT]
        })
      }

      if (this.stopped) throw new Error('Connector already stopped.') // Sometimes it takes too long for starting browser

      await this.openBrowser(this, this.browser)

      if (this.caps[Capabilities.WEBDRIVERIO_SHADOW_ROOT]) {
        const shadowRoot = await this.browser.$(this.caps[Capabilities.WEBDRIVERIO_SHADOW_ROOT])
        await shadowRoot.waitForDisplayed({ timeout: 10000 })
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

      const runOutputElementPolling = this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT] || this.caps[Capabilities.WEBDRIVERIO_RECEIVEFROMBOT]
      if (runOutputElementPolling) {
        debug('Starting output element polling loop.')
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
      }

      return {
        browserSessionId: this.browser.sessionId
      }
    } catch (err) {
      debug(`WebDriver error on startup: ${err.message || util.inspect(err)}`)
      throw new Error(`WebDriver error on startup: ${err.message || util.inspect(err)}`)
    } finally {
      if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS_DEBUG]) {
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
        if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS_DEBUG]) await this._saveDebugScreenshot('onusersays')
      }
      const inputPause = this.caps[Capabilities.WEBDRIVERIO_INPUTPAUSE]
      if (inputPause && inputPause > 0) {
        debug(`Pausing after input for ${inputPause}ms`)
        await new Promise((resolve) => setTimeout(resolve, inputPause))
      }
      if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'always') {
        const screenshot = await this._takeScreenshot('onusersays')
        if (screenshot) {
          msg.attachments = msg.attachments || []
          msg.attachments.push(screenshot)
        }
      }
      if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS_DEBUG]) await this._saveDebugScreenshot('onbotsays')

      const pageSource = await this._dumpPageSource('onusersays')
      if (pageSource) {
        msg.attachments = msg.attachments || []
        msg.attachments.push(pageSource)
      }
    })
  }

  async BotSays (msg) {
    debug(`BotSays called ${JSON.stringify(msg, null, 2)}`)

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
      if (this.browser && (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onbotsays' || this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'always')) {
        const screenshot = await this._takeScreenshot('onbotsays')
        if (screenshot) {
          msg.attachments = msg.attachments || []
          msg.attachments.push(screenshot)
        }
      }
      if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS_DEBUG]) await this._saveDebugScreenshot('onbotsays')
      const pageSource = await this._dumpPageSource('onbotsays')
      if (pageSource) {
        msg.attachments = msg.attachments || []
        msg.attachments.push(pageSource)
      }
      this.queueBotSays(msg)
    }
  }

  async Stop () {
    debug('Stop called')

    const localScreenshot = async () => {
      const screenshot = await this._takeScreenshot('onstop')
      if (screenshot && this.eventEmitter) {
        this.eventEmitter.emit('MESSAGE_ATTACHMENT', this.container, screenshot)
      }
    }
    const localDump = async () => {
      const dump = await this._dumpPageSource('onstop')
      if (dump && this.eventEmitter) {
        this.eventEmitter.emit('MESSAGE_ATTACHMENT', this.container, dump)
      }
    }

    if (this.browser) {
      if (this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'onstop' || this.caps[Capabilities.WEBDRIVERIO_SCREENSHOTS] === 'always') {
        if (this.queue) {
          await this._runInQueue(() => localScreenshot())
        } else {
          await localScreenshot()
        }
      }
      if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
        if (this.queue) {
          await this._runInQueue(() => localDump())
        } else {
          await localDump()
        }
      }
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
    const shouldLoadHtml = (
      this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'HASH' &&
      !this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE] &&
      !this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR]
    ) || this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]

    try {
      const r = await this.receiveFromBot(this, this.browser)

      for (const [index, element] of (r || []).entries()) {
        let html = null
        if (shouldLoadHtml) {
          try {
            html = await element.getHTML()
          } catch (err) {
          }
          if (!html) {
            try {
              html = await this.browser.getPageSource()
            } catch (err) {
            }
          }
        }

        try {
          let hashKey
          if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'INDEX') {
            hashKey = `${index}`
          } else if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'HASH') {
            if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR] || this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE]) {
              const hashElement = this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR] ? (await element.$(this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR])) : element
              if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE]) {
                hashKey = await hashElement.getAttribute(this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ATTRIBUTE])
                if (!hashKey) continue
              } else {
                const hashHtml = await hashElement.getHTML()
                hashKey = crypto.createHash('md5').update(hashHtml).digest('hex')
              }
            } else if (html) {
              hashKey = crypto.createHash('md5').update(html).digest('hex')
            } else {
              continue
            }
          } else if (this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_HASH] === 'TEXT') {
            const hashText = await _getTextFromElement(this, this.browser, element)
            if (hashText) {
              hashKey = crypto.createHash('md5').update(hashText).digest('hex')
            } else {
              continue
            }
          } else {
            hashKey = `${element.ELEMENT || element.elementId}`
          }

          if (this.handledElements.indexOf(hashKey) < 0) {
            debug(`Found new bot response element, id ${element.ELEMENT || element.elementId}, hashKey ${hashKey}`)

            if (html && this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) {
              debug(html)
            }
            this.handledElements.push(hashKey)
            await this.getBotMessage(this, this.browser, element, html)
          }
        } catch (err) {
          debug(`Failed in getBotMessage, skipping: ${err.message || err}`)
        }
      }
    } catch (err) {
      debug(`Failed in receiving from bot: ${err.message || err}`)
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
    const hook = HookUtils.getHook(this.caps, this.caps[capName])
    if (!hook) {
      return defaultFunction
    } else {
      return (...args) => {
        debug(`Running ${capName} hook function...`)
        return HookUtils.executeHook(this.caps, hook, ...args)
      }
    }
  }

  async _takeScreenshot (section) {
    if (this.browser) {
      const counter = this._screenshotSectionCounter('main')
      const screenshotFileName = `screenshot${counter}_${section}_${this._screenshotSectionCounter(section)}_.png`
      try {
        const filename = path.resolve(this.container.tempDirectory, screenshotFileName)
        const buffer = await this.browser.saveScreenshot(filename)
        debug(`Screenshot taken, size ${buffer.length}, saved to ${filename}`)
        return {
          name: screenshotFileName,
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
        const counter = this._screenshotSectionCounter('debug')
        const filename = path.resolve(this.container.tempDirectory, `${counter}_${section}_${this._screenshotSectionCounter(section)}_.png`)
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

  async _dumpPageSource (section, force = false) {
    if (!force && !this.caps[Capabilities.WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML]) return

    let html = null
    const htmlErr = []
    if (this.isWeb()) {
      try {
        const root = await this.findElement('//body')
        html = await root.getHTML()
      } catch (err) {
        htmlErr.push(err.message)
      }
    }
    if (!html) {
      try {
        html = await this.browser.getPageSource()
      } catch (err) {
        htmlErr.push(err.message)
      }
    }
    if (html) {
      try {
        html = pretty(html)
      } catch (err) {
        debug(`Failed to prettify HTML page source: ${err.message || err}`)
      }
      debug(html)
      const counter = this._screenshotSectionCounter('dump')
      const dumpFileName = `pagesource${counter}_${section}_${this._sourceSectionCounter(section)}.txt`
      try {
        const filename = path.resolve(this.container.tempDirectory, dumpFileName)
        fs.writeFileSync(filename, html)
      } catch (err) {
        debug(`Failed to write HTML page source: ${err.message || err}`)
      }
      return {
        name: dumpFileName,
        base64: Buffer.from(html).toString('base64'),
        mimeType: 'text/plain'
      }
    } else if (htmlErr.length > 0) {
      htmlErr.forEach(err => debug(`Failed to retrieve HTML page source: ${err.message || err}`))
    }
  }

  _sourceSectionCounter (section) {
    if (Object.prototype.hasOwnProperty.call(this.sourceCounterBySection, section)) {
      this.sourceCounterBySection[section]++
    } else {
      this.sourceCounterBySection[section] = 1
    }
    return this.sourceCounterBySection[section]
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
        name: 'WEBDRIVERIO_PROFILE_SELENIUM',
        label: 'Selenium Script',
        type: 'choice',
        required: false,
        choices: [
          { name: 'Google Dialogflow CX Messenger', key: 'dialogflowcx_messenger' },
          { name: 'Google Dialogflow Web Demo', key: 'dialogflow_com' },
          { name: 'MS BotBuilder Webchat (v3)', key: 'botbuilder_webchat_v3' },
          { name: 'MS BotBuilder Webchat (v4)', key: 'botbuilder_webchat_v4' },
          { name: 'MS BotBuilder Webchat (v4.10.0)', key: 'botbuilder_webchat_v4_10_0' },
          { name: 'IBM Watson Assistant Preview Link', key: 'watsonpreview' }
        ]
      },
      {
        name: 'WEBDRIVERIO_PROFILE_APPIUM',
        label: 'Appium Script',
        type: 'choice',
        required: false,
        choices: [
          { name: 'Whatsapp', key: 'whatsapp' }
        ]
      },
      {
        name: 'WEBDRIVERIO_LANGUAGE',
        label: 'Whatsapp Language',
        type: 'choice',
        required: false,
        choices: [
          { name: 'German', key: 'de' },
          { name: 'English', key: 'en' }
        ]
      }
    ]
  }
}
