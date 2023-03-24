const webdriverio = require('webdriverio')

const mockElement = {
  waitForDisplayed: jest.fn().mockName('waitForDisplayed')
}

jest.mock('webdriverio', () => {
  return {
    remote: () => ({
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
    })
  }
})

module.exports = {
  webdriverioMock: webdriverio,
  elementMock: mockElement
}