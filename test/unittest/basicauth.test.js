const { mockBrowserBehavior } = require('./mockWebdriver')
const { initConnector } = require('./helper')

const basicAuthToken = (username, password) => Buffer.from(`${username}:${password}`).toString('base64')

describe('HTTP basic auth', () => {
  afterEach(() => {
    mockBrowserBehavior.devtools = 'sendCommandAndGetResult'
  })

  test('rejects a username without a password', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin'
      }
    })
    await expect(connector.Validate()).rejects.toThrow('must be set together')
  })

  test('rejects a password without a username', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await expect(connector.Validate()).rejects.toThrow('must be set together')
  })

  test('rejects non-string credentials', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 1
      }
    })
    await expect(connector.Validate()).rejects.toThrow('must be strings')
  })

  test('sets the Authorization header through Chrome DevTools', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    expect(connector.browser.sendCommandAndGetResult).toHaveBeenNthCalledWith(1, 'Network.enable', {})
    expect(connector.browser.sendCommandAndGetResult).toHaveBeenNthCalledWith(2, 'Network.setExtraHTTPHeaders', {
      headers: { Authorization: `Basic ${basicAuthToken('admin', 'secret')}` }
    })
  })

  test('uses browser.cdp when that command is available', async () => {
    mockBrowserBehavior.devtools = 'cdp'
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    expect(connector.browser.cdp).toHaveBeenNthCalledWith(1, 'Network', 'enable', {})
    expect(connector.browser.cdp).toHaveBeenNthCalledWith(2, 'Network', 'setExtraHTTPHeaders', {
      headers: { Authorization: `Basic ${basicAuthToken('admin', 'secret')}` }
    })
  })

  test('uses sendCommand when sendCommandAndGetResult is missing', async () => {
    mockBrowserBehavior.devtools = 'sendCommand'
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: ''
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    expect(connector.browser.sendCommand).toHaveBeenNthCalledWith(2, 'Network.setExtraHTTPHeaders', {
      headers: { Authorization: `Basic ${basicAuthToken('admin', '')}` }
    })
  })

  test('does not call DevTools without credentials', async () => {
    const connector = initConnector({})
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(connector.browser.sendCommandAndGetResult).not.toHaveBeenCalled()
  })

  test('fails when the session cannot send DevTools commands', async () => {
    mockBrowserBehavior.devtools = null
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await expect(connector.Start()).rejects.toThrow('Chrome DevTools Protocol')
  })
})
