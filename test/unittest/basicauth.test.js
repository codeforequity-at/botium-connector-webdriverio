jest.mock('ws', () => require('./fakeWebSocket'))

const FakeWebSocket = require('./fakeWebSocket')
const { mockBrowserBehavior } = require('./mockWebdriver')
const { initConnector } = require('./helper')

const basicAuthToken = (username, password) => Buffer.from(`${username}:${password}`).toString('base64')
const originalFetch = global.fetch

const armDevTools = () => {
  mockBrowserBehavior.debuggerAddress = '127.0.0.1:9222'
  global.fetch = jest.fn(async (url) => {
    expect(url).toBe('http://127.0.0.1:9222/json/version')
    return {
      ok: true,
      status: 200,
      json: async () => ({ webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/test' })
    }
  })
}

const commands = (method) => {
  const socket = FakeWebSocket.instances[0]
  return (socket ? socket.sent : []).filter((message) => message.method === method)
}

describe('HTTP basic auth', () => {
  afterEach(() => {
    mockBrowserBehavior.devtools = 'sendCommandAndGetResult'
    mockBrowserBehavior.debuggerAddress = null
    FakeWebSocket.reset()
    global.fetch = originalFetch
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

  test('requires WEBDRIVERIO_URL', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_URL: '',
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await expect(connector.Start()).rejects.toThrow('requires WEBDRIVERIO_URL')
  })

  test('adds Authorization only for the origin of WEBDRIVERIO_URL', async () => {
    armDevTools()
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_BROWSERLOG: false,
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(commands('Target.setAutoAttach')[0].params).toEqual({
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: true
    })
    expect(commands('Network.setExtraHTTPHeaders')).toHaveLength(0)
    expect(commands('Fetch.enable')[0]).toMatchObject({
      sessionId: 'page-1',
      params: {
        patterns: [
          { urlPattern: 'http://test.com/*', requestStage: 'Request' },
          { urlPattern: 'http://test.com/', requestStage: 'Request' },
          { urlPattern: 'http://test.com', requestStage: 'Request' }
        ]
      }
    })

    const socket = FakeWebSocket.instances[0]
    socket.emit('message', JSON.stringify({
      method: 'Fetch.requestPaused',
      sessionId: 'page-1',
      params: {
        requestId: 'same-origin',
        request: {
          url: 'http://test.com/chat',
          headers: { Accept: 'text/html', Authorization: 'Basic stale' }
        }
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Fetch.requestPaused',
      sessionId: 'page-1',
      params: {
        requestId: 'other-origin',
        request: {
          url: 'https://cdn.example/brand.json',
          headers: { Accept: 'application/json' }
        }
      }
    }))

    const continued = commands('Fetch.continueRequest')
    expect(continued[0]).toMatchObject({
      sessionId: 'page-1',
      params: {
        requestId: 'same-origin',
        headers: [
          { name: 'Accept', value: 'text/html' },
          { name: 'Authorization', value: `Basic ${basicAuthToken('admin', 'secret')}` }
        ]
      }
    })
    expect(continued[1]).toEqual({
      id: continued[1].id,
      method: 'Fetch.continueRequest',
      sessionId: 'page-1',
      params: { requestId: 'other-origin' }
    })
    expect(JSON.stringify(socket.sent)).not.toContain('secret')

    await connector.Stop()
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED)
  })

  test('allows an empty password', async () => {
    armDevTools()
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_BROWSERLOG: false,
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: ''
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    const socket = FakeWebSocket.instances[0]
    socket.emit('message', JSON.stringify({
      method: 'Fetch.requestPaused',
      sessionId: 'page-1',
      params: {
        requestId: 'same-origin',
        request: { url: 'http://test.com/', headers: {} }
      }
    }))
    const continued = commands('Fetch.continueRequest')
    expect(continued[0].params.headers).toEqual([
      { name: 'Authorization', value: `Basic ${basicAuthToken('admin', '')}` }
    ])
    await connector.Stop()
  })

  test('does not open DevTools without credentials', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_BROWSERLOG: false
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(FakeWebSocket.instances).toHaveLength(0)
    expect(connector.browser.sendCommandAndGetResult).not.toHaveBeenCalled()
  })

  test('fails when the session has no debugger address', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await expect(connector.Start()).rejects.toThrow('Chrome DevTools Protocol')
    expect(FakeWebSocket.instances).toHaveLength(0)
  })
})
