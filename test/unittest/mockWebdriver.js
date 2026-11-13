const webdriverio = require('webdriverio')

const mockElement = {
  waitForDisplayed: jest.fn().mockName('waitForDisplayed')
}

const mockBrowserBehavior = {
  devtools: 'sendCommandAndGetResult'
}

jest.mock('webdriverio', () => {
  return {
    Key: { Enter: '\uE007' },
    remote: () => {
      const browser = {
        url: jest.fn().mockName('url'),
        getTitle: jest.fn().mockName('getTitle'),
        setWindowSize: jest.fn().mockName('setWindowSize'),
        execute: jest.fn().mockName('execute'),
        getPageSource: jest.fn().mockName('getPageSource'),
        pause: jest.fn().mockName('pause'),
        waitUntil: jest.fn().mockName('waitUntil'),
        switchToParentFrame: jest.fn().mockName('switchToParentFrame'),
        switchToFrame: jest.fn().mockName('switchToFrame'),
        getContexts: jest.fn().mockName('getContexts'),
        setTimeout: jest.fn().mockName('setTimeout'),
        $: jest.fn(() => mockElement).mockName('$'),
        $$: jest.fn(() => mockElement).mockName('$$'),
        deleteSession: jest.fn().mockName('deleteSession'),
        saveScreenshot: jest.fn().mockName('saveScreenshot')
      }
      if (mockBrowserBehavior.devtools === 'cdp') {
        browser.cdp = jest.fn().mockName('cdp')
      } else if (mockBrowserBehavior.devtools === 'sendCommand') {
        browser.sendCommand = jest.fn().mockName('sendCommand')
      } else if (mockBrowserBehavior.devtools === 'sendCommandAndGetResult') {
        browser.sendCommandAndGetResult = jest.fn().mockName('sendCommandAndGetResult')
      }
      return browser
    }
  }
})

module.exports = {
  webdriverioMock: webdriverio,
  elementMock: mockElement,
  mockBrowserBehavior
}
