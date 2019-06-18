module.exports = {
  'WEBDRIVERIO_INPUT_ELEMENT': '[data-id=\'webchat-sendbox-input\']',
  'WEBDRIVERIO_INPUT_ELEMENT_BUTTON': '//button/nobr[contains(text(),\'{{button.text}}\')]',
  'WEBDRIVERIO_OUTPUT_ELEMENT': '//div[(@class=\'webchat__row message\' or @class=\'webchat__row attachment\') and not(descendant::div[contains(@class,\'from-user\')])]',
  'WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED': false
}
