module.exports = {
  'WEBDRIVERIO_INPUT_ELEMENT': '[data-id=\'webchat-sendbox-input\']',
  'WEBDRIVERIO_OUTPUT_ELEMENT': '//div[(@class=\'row message\' or @class=\'row attachment\') and not(descendant::div[contains(@class,\'from-user\')])]'
}
