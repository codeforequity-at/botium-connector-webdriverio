const _ = require('lodash')
const debug = require('debug')('botium-connector-webdriverio-whatsapp')

const _whatsappLabelsByLanguage = {
  de: {
    btnOptions: 'Weitere Optionen',
    btnClean: 'Chat leeren',
    btnCleanOk: 'LEEREN'
  },
  en: {
    btnOptions: 'More options',
    btnClean: 'Clear chat',
    btnCleanOk: 'CLEAR CHAT'
  }
}

const whatsappLabels = (container) => {
  const labels = {}
  if (container.caps.WEBDRIVERIO_LANGUAGE && _whatsappLabelsByLanguage[container.caps.WEBDRIVERIO_LANGUAGE]) {
    Object.assign(labels, _whatsappLabelsByLanguage[container.caps.WEBDRIVERIO_LANGUAGE])
  }
  if (container.caps.WEBDRIVERIO_WHATSAPPLABELS) {
    if (_.isString(container.caps.WEBDRIVERIO_WHATSAPPLABELS)) {
      Object.assign(labels, JSON.parse(container.caps.WEBDRIVERIO_WHATSAPPLABELS))
    } else {
      Object.assign(labels, container.caps.WEBDRIVERIO_WHATSAPPLABELS)
    }
  }
  if (Object.keys(labels).length > 0) return labels
  else return null
}

module.exports = {
  VALIDATE: (container) => {
    if (!container.caps.WEBDRIVERIO_CONTACT) throw new Error('Capability WEBDRIVERIO_CONTACT not given')
    if (!whatsappLabels(container)) throw new Error(`Capability WEBDRIVERIO_LANGUAGE/WEBDRIVERIO_WHATSAPPLABELS invalid, set language to one of ${Object.keys(_whatsappLabelsByLanguage).join(' / ')}, or WEBDRIVERIO_WHATSAPPLABELS`)
  },
  WEBDRIVERIO_APPPACKAGE: 'com.whatsapp',
  WEBDRIVERIO_APPACTIVITY: 'com.whatsapp.HomeActivity',
  WEBDRIVERIO_APPNORESET: true,
  WEBDRIVERIO_OPENBOT: async (container) => {
    const botUser = container.caps.WEBDRIVERIO_CONTACT
    const labels = whatsappLabels(container)

    try {
      const celSel = `//*[@resource-id="com.whatsapp:id/conversations_row_contact_name" and @text="${botUser}"]`
      const cel = await container.findElement(celSel)
      await cel.click()
      debug(`Selected contact ${botUser} in Whatsapp contact list.`)
    } catch (err) {
      debug(`Failed to select contact ${botUser} in contact list: ${err.message}`)
      debug(`Finding contact ${botUser} with Whatsapp contact search ...`)

      const btnSearch = await container.findElement('//*[@resource-id="com.whatsapp:id/menuitem_search"]')
      await btnSearch.click()

      const searchInputElement = await container.findElement('//*[@resource-id="com.whatsapp:id/search_input"]')
      await searchInputElement.setValue(botUser)

      const ceSel = `//*[@resource-id="com.whatsapp:id/result_list"]//*[@resource-id="com.whatsapp:id/conversations_row_contact_name" and @text="${botUser}"]`
      debug(`Finding contact ${botUser}: ${ceSel}`)

      const ce = await container.findElement(ceSel)
      await ce.click()
    }

    debug(`Cleaning up chat history for ${botUser} ...`)

    const btnOptions = await container.findElement(`//*[@content-desc="${labels.btnOptions}"]`)
    await btnOptions.click()

    const btnSub = await container.findElement('//*[@resource-id="com.whatsapp:id/submenuarrow"]')
    await btnSub.click()

    const btnClean = await container.findElement(`//*[@resource-id="com.whatsapp:id/title" and @text="${labels.btnClean}"]`)
    await btnClean.click()

    const btnCleanOk = await container.findElement(`//*[@resource-id="android:id/button1" and @text="${labels.btnCleanOk}"]`)
    await btnCleanOk.click()

    debug(`Cleaning up chat history for ${botUser} ready`)

    const inputElementVisibleTimeout = container.caps.WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT || 10000
    const inputElement = await container.findElement(module.exports.WEBDRIVERIO_INPUT_ELEMENT)
    await inputElement.waitForDisplayed({ timeout: inputElementVisibleTimeout })
  },
  WEBDRIVERIO_INPUT_ELEMENT: '//*[@resource-id="com.whatsapp:id/entry"]',
  WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON: '//*[@resource-id="com.whatsapp:id/send"]',
  WEBDRIVERIO_INPUTPAUSE: 2000,
  WEBDRIVERIO_OUTPUT_XPATH: true,
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH: 'TEXT',
  WEBDRIVERIO_OUTPUT_ELEMENT: '//*[(@resource-id="com.whatsapp:id/conversation_text_row" or @resource-id="com.whatsapp:id/text_and_date") and not(descendant::*[@resource-id="com.whatsapp:id/status"])]',
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: './/*[(@resource-id="com.whatsapp:id/message_text" or @resource-id="com.whatsapp:id/caption")]',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS: false,
  WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA: false,
  WEBDRIVERIO_IGNOREUPFRONTMESSAGES: true
}
