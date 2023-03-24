const { webdriverioMock, elementMock } = require('./mockWebdriver')
const { initConnector } = require('./helper')

describe('Webdriver Input Element', () => {
  test('Should call waitForDisplayed for required input element', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_INPUT_ELEMENT: '.test'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(elementMock.waitForDisplayed.mock.calls).toHaveLength(1)
  })
  test('Should not call waitForDisplayed for optional input element', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_INPUT_ELEMENT: '.test',
        WEBDRIVERIO_INPUT_ELEMENT_SKIP_WAITFORDISPLAYED: true
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(elementMock.waitForDisplayed.mock.calls).toHaveLength(0)
  })
})
