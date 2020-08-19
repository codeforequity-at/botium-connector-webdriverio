module.exports = {
  WEBDRIVERIO_INPUT_ELEMENT: '[data-id=\'webchat-sendbox-input\']',
  WEBDRIVERIO_OUTPUT_ELEMENT: '//div[(contains(@class,\'webchat__stacked-layout__message-row\') or contains(@class,\'webchat__stacked-layout__attachment-row\')) and not(descendant::div[contains(@class,\'webchat__bubble--from-user\')])]',
  WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED: true,
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED: true,
  WEBDRIVERIO_OUTPUT_ELEMENT_TEXT: './/div[contains(@class,\'webchat__bubble__content\')]/*[1]',
  WEBDRIVERIO_OUTPUT_ELEMENT_EXTRA_BUTTONS: '//div[@role=\'status\']//button',
  WEBDRIVERIO_OUTPUT_ELEMENT_HASH: 'TEXT'
}
