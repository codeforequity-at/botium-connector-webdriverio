const BotiumBindings = require('botium-bindings')
BotiumBindings.helper.jest().setupJestTestSuite({ bb: new BotiumBindings({ convodirs: [__dirname] }) })
