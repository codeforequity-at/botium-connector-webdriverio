module.exports = {
  WEBDRIVERIO_INPUT_ELEMENT: '[data-id=\'webchat-sendbox-input\']',
  WEBDRIVERIO_OUTPUT_ELEMENT: '//div[(@class=\'webchat__row message\' or @class=\'webchat__row attachment\') and not(descendant::div[contains(@class,\'from-user\')])]',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED: true,
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED: true,
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: './/div[@class=\'webchat__bubble__content\']/*[1]',
  WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS: '//div[@role=\'status\']//button',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH: 'TEXT'
}
