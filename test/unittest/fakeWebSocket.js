const { EventEmitter } = require('events')

class FakeWebSocket extends EventEmitter {
  constructor (url) {
    super()
    this.url = url
    this.readyState = FakeWebSocket.CONNECTING
    this.sent = []
    FakeWebSocket.instances.push(this)
    setImmediate(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return
      this.readyState = FakeWebSocket.OPEN
      this.emit('open')
    })
  }

  send (data) {
    const message = JSON.parse(data)
    this.sent.push(message)
    if (message.method === 'Target.setAutoAttach' && FakeWebSocket.attachOnAuto) {
      this.emit('message', JSON.stringify({
        method: 'Target.attachedToTarget',
        params: { sessionId: 'page-1', targetInfo: { type: 'page' } }
      }))
    }
    setImmediate(() => {
      this.emit('message', JSON.stringify({ id: message.id, result: {} }))
    })
  }

  close () {
    this.readyState = FakeWebSocket.CLOSED
    this.emit('close')
  }
}

FakeWebSocket.CONNECTING = 0
FakeWebSocket.OPEN = 1
FakeWebSocket.CLOSING = 2
FakeWebSocket.CLOSED = 3
FakeWebSocket.instances = []
FakeWebSocket.attachOnAuto = true
FakeWebSocket.reset = () => {
  FakeWebSocket.instances = []
  FakeWebSocket.attachOnAuto = true
}

module.exports = FakeWebSocket
