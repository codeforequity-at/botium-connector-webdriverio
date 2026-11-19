jest.mock('ws', () => require('./fakeWebSocket'))

const debugLib = require('debug')
const FakeWebSocket = require('./fakeWebSocket')
const { mockBrowserBehavior } = require('./mockWebdriver')
const { initConnector } = require('./helper')

const originalFetch = global.fetch
const lines = []
const originalLog = debugLib.log

const armDevTools = () => {
  mockBrowserBehavior.debuggerAddress = '127.0.0.1:9222'
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/test' })
  }))
}

const commands = (method) => {
  const socket = FakeWebSocket.instances[0]
  return (socket ? socket.sent : []).filter((message) => message.method === method)
}

describe('browser console log', () => {
  beforeEach(() => {
    lines.length = 0
    debugLib.log = (...args) => {
      lines.push(args.map((part) => String(part)).join(' '))
    }
    debugLib.enable('botium-connector-webdriverio')
  })

  afterEach(() => {
    mockBrowserBehavior.debuggerAddress = null
    FakeWebSocket.reset()
    global.fetch = originalFetch
    debugLib.log = originalLog
    debugLib.disable()
  })

  test('rejects an unknown level', async () => {
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_BROWSERLOG: 'verbose'
      }
    })
    await expect(connector.Validate()).rejects.toThrow('WEBDRIVERIO_BROWSERLOG')
  })

  test('does not attach when logging is disabled', async () => {
    armDevTools()
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_BROWSERLOG: 'off'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(FakeWebSocket.instances).toHaveLength(0)
    await connector.Stop()
  })

  test('skips quietly when the debugger address is missing', async () => {
    const connector = initConnector({})
    await connector.Validate()
    await connector.Build()
    await connector.Start()
    expect(FakeWebSocket.instances).toHaveLength(0)
    expect(lines.some((line) => line.includes('debugger address is not available'))).toBe(true)
  })

  test('logs errors by default and shares the auth socket', async () => {
    armDevTools()
    const connector = initConnector({
      caps: {
        WEBDRIVERIO_HTTP_BASIC_USERNAME: 'admin',
        WEBDRIVERIO_HTTP_BASIC_PASSWORD: 'secret'
      }
    })
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(commands('Fetch.enable')).toHaveLength(1)
    expect(commands('Runtime.enable')).toHaveLength(1)
    expect(commands('Log.enable')).toHaveLength(1)
    expect(commands('Runtime.enable')[0].sessionId).toBe('page-1')

    const socket = FakeWebSocket.instances[0]
    socket.emit('message', JSON.stringify({
      method: 'Runtime.consoleAPICalled',
      params: {
        type: 'error',
        args: [{ type: 'string', value: 'widget failed' }],
        stackTrace: { callFrames: [{ url: 'https://cdn.example/widget.js', lineNumber: 11 }] }
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Runtime.consoleAPICalled',
      params: {
        type: 'warning',
        args: [{ type: 'string', value: 'widget warning' }]
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Runtime.consoleAPICalled',
      params: {
        type: 'info',
        args: [{ type: 'string', value: 'chat ready' }]
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Runtime.exceptionThrown',
      params: {
        exceptionDetails: {
          url: 'https://cdn.example/widget.js',
          lineNumber: 4,
          text: 'Uncaught',
          exception: { type: 'object', description: 'TypeError: Failed to fetch' }
        }
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Log.entryAdded',
      params: {
        entry: { source: 'javascript', level: 'error', text: 'duplicate console error' }
      }
    }))
    socket.emit('message', JSON.stringify({
      method: 'Log.entryAdded',
      params: {
        entry: { source: 'network', level: 'error', text: 'Failed to load brand.json', url: 'https://cdn.example/brand.json', lineNumber: -1 }
      }
    }))

    expect(lines.some((line) => line.includes('browser console error: widget failed (https://cdn.example/widget.js:12)'))).toBe(true)
    expect(lines.some((line) => line.includes('widget warning'))).toBe(false)
    expect(lines.some((line) => line.includes('chat ready'))).toBe(false)
    expect(lines.some((line) => line.includes('browser exception: TypeError: Failed to fetch (https://cdn.example/widget.js:5)'))).toBe(true)
    expect(lines.some((line) => line.includes('duplicate console error'))).toBe(false)
    expect(lines.some((line) => line.includes('browser network error: Failed to load brand.json (https://cdn.example/brand.json)'))).toBe(true)
    expect(lines.some((line) => line.includes('secret'))).toBe(false)

    await connector.Stop()
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED)
  })
})
