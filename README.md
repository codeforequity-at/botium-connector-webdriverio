# Botium Connector for WebdriverIO scripts

[![NPM](https://nodei.co/npm/botium-connector-webdriverio.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-webdriverio/)

[ ![Codeship Status for codeforequity-at/botium-connector-webdriverio](https://app.codeship.com/projects/5a00af50-a179-0136-73f5-0e24fd8eaa40/status?branch=master)](https://app.codeship.com/projects/306730)
[![npm version](https://badge.fury.io/js/botium-connector-webdriverio.svg)](https://badge.fury.io/js/botium-connector-webdriverio)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

Supports running [Botium](https://github.com/codeforequity-at/botium-core) scripts on Websites with Webdriver, backed by a Selenium server.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

This is technical documentation on a rather low level. As introduction to E2E-Testing with Botium, here are are links to some articles you should read first:
* [Botium in a Nutshell, Part 6: E2E-Testing with Botium Box](https://medium.com/@floriantreml/botium-in-a-nutshell-part-6-e2e-testing-with-botium-box-9bd8acdf5a70)
* [Run Selenium Grid and Connect to Botium Box](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/32145510/Run+Selenium+Grid+and+Connect+to+Botium+Box)

## Attention: Breaking Change with Version 0.2.0
<font color='red'>With Version 0.2.0 of this connector we switched [from Webdriver 4 to Webdriver 5](https://webdriver.io/blog/2018/12/19/webdriverio-v5-released.html). To continue using Webdriver 4 with your Selenium scripts, use the NPM package **botium-connector-webdriverio4** instead of **botium-connector-webdriverio**.</font>

## How it works ?
Botium uses the [Webdriver.io](https://webdriver.io/) library to run conversations against a chatbot running on a website.

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements

* __Node.js and NPM__
* a chatbot running on a website
* a __project directory__ on your workstation to hold test cases and Botium configuration

## Install Botium and Webdriver IO Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-webdriverio
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-webdriverio
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__:

_Already integrated into Botium Box, no setup required_

## Preparation Steps: Selenium server

An installed and running Selenium server is required. If you don't have a Selenium server already installed (or access to a cloud based Selenium server like Saucelabs), you can use the scripts in this repository as a starter to either install a full-blown Selenium server, or just a headless Chrome browser.

### Installing and starting the Selenium server (with Chrome, Edge, Firefox)

As a starter, this repository includes scripts for installing and starting a Selenium server with the help of [selenium-standalone](https://github.com/vvo/selenium-standalone)-package. 

#### Preparation

First, you have to install a recent Java Runtime Environment - see [here](https://github.com/vvo/selenium-standalone#ensure-you-have-the-minimum-required-java-version) for required versions. An of course, you need Node.js and Git client.

Clone the repository:

`> git clone https://github.com/codeforequity-at/botium-connector-webdriverio.git`

Install requirements, Selenium server and drivers for the most common browsers

```
> npm install
> npm run selenium-install
```

It downloads and installs the __latest webdrivers for common browsers__. Maybe you will have to install a previous version of the webdriver for a browser, in case you havn't installed the latest version of the browser - this is possible, but out of scope for this documentation, please consult the [selenium-standalone](https://github.com/vvo/selenium-standalone)-documentation.

_Note: in case of troubles with Selenium installation, this project is not the right place to ask, as it is almost surly a problem with Selenium, not with Botium._

#### Start the integreated Selenium server

To automatically start the integrated Selenium server when Botium is executing, use the **WEBDRIVERIO_START_SELENIUM** capability (see below).

#### Start the Selenium server from command line

```
> npm run selenium
```

With this running Selenium server you can now run the Botium samples.

### Using headless chrome

As a very small replacement you can also start with headless Chrome browser. You won't need a separate Selenium installation in this case.

Setting the capability "WEBDRIVERIO_START_CHROMEDRIVER" to true will make Botium start an integrated Chrome automatically (and stop it afterwards).

## Preparation Steps: Analyze Chatbot Widget

If you ever worked with Selenium, you are aware that writing an automation script usually is a time-consuming task. This Botium connector helps you in writing automation scripts for a chatbot widget embedded on a website and speeds up the development process by making reasonable assumptions:
* There maybe is some kind of click-through to actually __open the chatbot__
* The chatbot has an __input text field__, or some buttons to click (however it looks)
* The chatbot outputs reponses in some kind of __list within a window__ (however it looks)

All those assumptions can be parameterized for adapting it to your actual chatbot website with Botium capabilities:

* _WEBDRIVERIO_URL_ to point to the website to launch for accessing the chatbot
* _WEBDRIVERIO_INPUT_ELEMENT_, the [Webdriver selector](https://webdriver.io/docs/selectors.html) for the input text field
* _WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON_, the [Webdriver selector](https://webdriver.io/docs/selectors.html) for the "Send"-Button (if present, otherwise message to the chatbot is sent with "Enter" key)
* _WEBDRIVERIO_OUTPUT_ELEMENT_, the [Webdriver selector](https://webdriver.io/docs/selectors.html) for the chatbot output elements

If there are additional steps (mouse clicks) to do on the website before the chatbot is accessible, you will have to extend the pre-defined Selenium scripts with custom behaviour (see below).

For some common chatbot widgets and websites, Botium provides out-of-the-box Selenium scripts by setting the Botium capability __WEBDRIVERIO_PROFILE__ to one of the pre-defined Selenium scripts.

### botbuilder_webchat_(version) - Microsoft Bot Framework Webchat
For chatbots published with the [Bot Framework Webchat Widget](https://github.com/Microsoft/BotFramework-WebChat). Point the capability _WEBDRIVERIO_URL_ to the full URL of the website where the widget is embedded.
Currently supported:
* botbuilder_webchat_v3
* botbuilder_webchat_v4

### dialogflow_com - Dialogflow Web Demo Chatbot
For chatbots published as Dialogflow "Web Demo". Point the capability _WEBDRIVERIO_URL_ to the full URL of the embedded Dialogflow Web Demo (for example: "https://console.dialogflow.com/api-client/demo/embedded/d388ac41-5c60-483f-b89b-0ec0d99d848d").

### watsonpreview - IBM Watson Assistant Preview Link
For Watson Assistant chatbots published as [Preview Link](https://cloud.ibm.com/docs/services/assistant?topic=assistant-deploy-web-link). Point the capability _WEBDRIVERIO_URL_ to the full URL of the chatbot page (for example: "https://assistant-chat-eu-de.watsonplatform.net/web/public/xxxxxxx").

### messenger_com - Facebook Messenger Chatbot (experimental)
For chatbots published in [Facebook Messenger](https://www.messenger.com).

* Point the capability _WEBDRIVERIO_URL_ to the full URL of the chatbot page (for example: "https://www.messenger.com/t/1271293572983985").
* Additionally, set the capabilities _WEBDRIVERIO_USERNAME_ and _WEBDRIVERIO_PASSWORD_ to your Facebook credentials

## Customize pre-defined Selenium Scripts
While the pre-defined Selenium scripts make reasonable assumptions, it is not unusual that your chatbot widget and your website has some very special behaviour to address. In those cases, there are some Selenium- and Node.js-Coding skills required.

Customization is done by injection Node.js-Code into Botium. The code to executed is injected by providing a capability to Botium. The capability can contain:

* a pointer to a _Javascript Function_ (not possible when configuration is done in _botium.json_ file)
* the name of an _NPM Package_, which exports a single function
* a _Javascript file name_ relative to the current working directory, which exports a single function (see below)
* _Javascript code_ to be compiled and executed (see below)

### Placing code in a Javascript file

When placing code in a Javascript file, make sure to export exactly one function. The function has to return a Promise. The parameters handed over to the function are described below.

```
module.exports = (container, browser) => {
 return browser.waitForVisible('.cc-btn', 20000)
 .click('.cc-btn')
 .pause(2000)
 .waitForVisible('#StartChat', 20000)
 .click('#StartChat')
 .waitForVisible('#chat', 10000)
 .waitForVisible('#textInput', 10000)
 .waitForVisible('.from-watson', 10000)
}

```

### Placing code in a capability as String

When placing the code in a string capability, make sure to assign a Promise to the _result_ variable. The parameters handed over to the function are described below.

```
result = browser.waitForVisible('.cc-btn', 20000)
 .click('.cc-btn')
 .pause(2000)
 .waitForVisible('#StartChat', 20000)
 .click('#StartChat')
 .waitForVisible('#chat', 10000)
 .waitForVisible('#textInput', 10000)
 .waitForVisible('.from-watson', 10000)
```

The capabilities representing the extension points are:

### WEBDRIVERIO_OPENBROWSER
Pre-defined behaviour:
* Opening website url
* Wait for page title
* Setting viewport size

This has to be customized rarely.

Extension function called with arguments: _container_, _browser_

### WEBDRIVERIO_OPENBOT
Pre-defined behaviour:
* Waiting until the input text field is visible

This has to be customized often - for example, to click away the typical "Cookie"-warning from a website, clicking on the chatbot button at the bottom right of the website, ...

The _samples/custom_ folder has an example for this scenario.

Extension function called with arguments: _container_, _browser_

### WEBDRIVERIO_SENDTOBOT
Pre-defined behaviour:
* Set value of text input field
* Send "Enter" or simulate button click (if WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON capability is available)

This has to be customized rarely.

Extension function called with arguments: _container_, _browser_, _msg

### WEBDRIVERIO_RECEIVEFROMBOT
Pre-defined behaviour:
* Poll for new chatbot response elements

This has to be customized rarely.

Extension function called with arguments: _container_, _browser_

### WEBDRIVERIO_GETBOTMESSAGE
Pre-defined behaviour:
* Chatbot output is the text value of the chatbot response elements

This has to be customized sometimes. This extension function is responsible for extracting the chatbot output from the HTML element (as notified from the _WEBDRIVERIO_RECEIVEFROMBOT_ function) and converting it to a Botium message.

Extension function called with arguments: _container_, _browser_, _elementId_

## Webdriver Settings (Select Browser)

Configuration of the Webdriver and Selenium is not done by Botium itself, but by passing on the content of the capability _WEBDRIVERIO_OPTIONS_ to [Webdriver.io](https://webdriver.io/docs/options.html).

This example selects Chrome browser:

```
{
  "botium": {
    "Capabilities": {
      ...
      "WEBDRIVERIO_OPTIONS": {	
        "capabilities": {
          "browserName": "chrome"      
        }
      }
      ...
    }
  }
}
```

This example selects the cloud device provider Saucelabs:

```
{
  "botium": {
    "Capabilities": {
      ...
      "WEBDRIVERIO_OPTIONS": {
        "capabilities": {
          "deviceName": "Samsung Galaxy S6 GoogleAPI Emulator",
          "platformName": "Android",
          "platformVersion": "7.0",
          "browserName": "Chrome",
          "name": "Banking Chatbot Tests",
          "tags": "botium, chatbot",
          "username": "xxx",
          "accessKey": "xxxxx"
        },
        "hostname": "ondemand.saucelabs.com",
        "port": 80
      },
      ...
    }
  }
}
```

## Running the samples

```
> cd samples/dialogflow
> npm install && npm test
```

(This sample will use the a headless Chrome brwoser)

Check the botium.json files in the sample directories for setting up the browser to use for the Botium conversation. You maybe have to tune the Selenium capabilities in the botium.json file - again, in case of troubles with Selenium, this project is not the right place to ask.

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __webdriverio__ to activate this connector.

### WEBDRIVERIO_OPTIONS
The [Webdriver.io](https://webdriver.io/docs/options.html)-Options (see above)

### WEBDRIVERIO_URL
The url to open in the browser

### WEBDRIVERIO_HTTP_PROXY / WEBDRIVERIO_HTTPS_PROXY / WEBDRIVERIO_NO_PROXY
HTTP(S) proxy settings and exception rules used between browser and internet - see [here](https://webdriver.io/docs/proxy.html).

Sample configuration:

    ...
    "WEBDRIVERIO_HTTP_PROXY": "my-corporate-proxy-host:some-port",
    "WEBDRIVERIO_HTTPS_PROXY": "my-corporate-proxy-host:some-port",
    "WEBDRIVERIO_NO_PROXY": "*.internal.addresses",
    ...

### WEBDRIVERIO_VIEWPORT_SIZE
Set browser view port size to dimensions
Example:

    ...
    WEBDRIVERIO_VIEWPORT_SIZE: { width: 1280, height: 768 },
    ...

### WEBDRIVERIO_PROFILE
Choose pre-defined Selenium scripts (see above)

* messenger_com - Facebook Messenger (experimental)
* dialogflow_com - Google Dialogflow Web Demo
* botbuilder_webchat_v3 - MS BotBuilder Webchat (v3)
* botbuilder_webchat_v4 - MS BotBuilder Webchat (v4)
* watsonpreview - IBM Watson Assistant Preview Link

### WEBDRIVERIO_OPENBROWSER
Extension function to start up the browser (see above)

### WEBDRIVERIO_OPENBOT
Extension function to navigate to the chatbot and/or make the chatbot visible after opening the url in the browser (see above)

### WEBDRIVERIO_OPENBOTPAUSE
Pause execution for given amount of milliseconds after the chatbot is visible (maybe waiting for initialization)

### WEBDRIVERIO_SENDTOBOT
Extension function to send a message to the chatbot (see above)

### WEBDRIVERIO_RECEIVEFROMBOT
Extension function to gather chatbot response (see above)

### WEBDRIVERIO_GETBOTMESSAGE
Extension function to extract the message from the chatbot response element (see above)

### WEBDRIVERIO_SHADOW_ROOT
The root element selector for chatbots hosted within a [Shadow DOM](https://wiki.selfhtml.org/wiki/HTML/Web_Components/Shadow_DOM)

### WEBDRIVERIO_INPUT_ELEMENT
[Webdriver selector](https://webdriver.io/docs/selectors.html) for the input text field

### WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT
_Default: 10000ms (10 sec)_

Wait for the input element to become visible. If not visible within this amount of milliseconds, test fails.

### WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON
Simulate button click for sending a text message (if not set: _Enter_ key is simulated)

### WEBDRIVERIO_INPUT_ELEMENT_BUTTON
_Default: //button[contains(text(),\'{{button.text}}\')][last()] | //a[contains(text(),\'{{button.text}}\')][last()]_

[Webdriver selector](https://webdriver.io/docs/selectors.html) for selecting the button to click for the user input method BUTTON in Botium Script:

```
#me
BUTTON ClickMe
```

By default, a button or a hyperlink showing the given text is selected, this should match most use cases. The capability is a [Mustache template](https://github.com/janl/mustache.js) and filled with the button text given in BotiumScript.

For example, if you want to select the button to click based on the _title_ attribute, use this Webdriver selector:

_button[title*='{button.text}']_

### WEBDRIVERIO_OUTPUT_ELEMENT
[Webdriver selector](https://webdriver.io/docs/selectors.html) for the chatbot output elements

### WEBDRIVERIO_OUTPUT_ELEMENT_TEXT and WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED
[Webdriver selector](https://webdriver.io/docs/selectors.html) for selecting the text portion within the identified output elements - default behaviour is to just get the displayed text

If the selector is relative to the identified WEBDRIVERIO_OUTPUT_ELEMENT, set WEBDRIVERIO_OUTPUT_ELEMENT_TEXT_NESTED to _true_ (default).

### WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS and WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED
_Default: .//button | .//a[@href]_

[Webdriver selector](https://webdriver.io/docs/selectors.html) for selecting the buttons within the identified output elements - default behaviour is to read HTML buttons and hyperlinks

If the selector is relative to the identified WEBDRIVERIO_OUTPUT_ELEMENT, set WEBDRIVERIO_OUTPUT_ELEMENT_BUTTONS_NESTED to _true_ (default). Some chatbot widgets show Quick Response Buttons as overlay, not within the DOM of the chat window - for these cases, setting this capability to _false_ will help.


### WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA and WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED
_Default: .//img | .//video | .//audio_

[Webdriver selector](https://webdriver.io/docs/selectors.html) for selecting the media attachments within the identified output elements - default behaviour is to check for pictures, videos and audio attachments

If the selector is relative to the identified WEBDRIVERIO_OUTPUT_ELEMENT, set WEBDRIVERIO_OUTPUT_ELEMENT_MEDIA_NESTED to _true_ (default).

### WEBDRIVERIO_OUTPUT_ELEMENT_HASH
_Default: ELEMENTID_

The algorithm used to calculate a unique identifier for an identified output element. By default, the Webdriver element identifier is chosen, and this works in most cases. But depending on the level of dynamic content, it might be a better approach to use the output HTML content itself as (very long) identifier. This is recommended in those cases:

* On iOs the Webdriver element identifier is not unique, so you have to rely on HTML content to be unique
* If you have a unique identifier in the HTML content (in combination with _WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR_)

Possible values:

* ELEMENTID - use the Webdriver element identifier
* HASH - use the HTML output as identifier

### WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR
_Default: empty_

If _WEBDRIVERIO_OUTPUT_ELEMENT_HASH_ is **HASH**, then it is possible to specify a selector for the unique HTML content. 

For instance, HTML for a bot message could look like this:

```
<div class="bot-message"><div class="text" id="1683949299888">Hey, meat bag!</div></div>

```

* **WEBDRIVERIO_OUTPUT_ELEMENT** - //div[contains(@class,'bot-message')]
* **WEBDRIVERIO_OUTPUT_ELEMENT_HASH** - HASH
* **WEBDRIVERIO_OUTPUT_ELEMENT_HASH_SELECTOR** - ./div[contains(@class,'text')]

### WEBDRIVERIO_OUTPUT_ELEMENT_DEBUG_HTML
_Default: false_

Print the output element HTML content to the debug stream. Important for development phase, to actually see what Botium is receiving.

### WEBDRIVERIO_IGNOREUPFRONTMESSAGES
_Default: false_

If set, all chatbot responses received before first message is sent are ignored. This is for ignoring welcome messages and other things sent upfront from the chatbot (usage instructions, welcome back, ...)

### WEBDRIVERIO_IGNOREWELCOMEMESSAGES
Ignore a fixed number of messages received from the chatbot. For instance, if there are always 4 welcome messages displayed, set this capability to _4_ to ignore them.

### WEBDRIVERIO_IGNOREEMPTYMESSAGES
_Default: false_

If set, all recognized messages with don't include a text, buttons or media files are ignored. This is for ignoring messages without any content, for example a placeholder for a "Bot is typing" visualization.

### WEBDRIVERIO_USERNAME and WEBDRIVERIO_PASSWORD
Login data if required - _messenger_com_-profile requires Facebook login.

### WEBDRIVERIO_SCREENSHOTS
_Default: none_

Make screenshots and include it in the Botium message
* _none_ - no screenshots
* _onbotsays_ - attach screenshot after each received message
* _onstop_ - attach screenshot after conversation is ready

*Note: when debug mode is enabled (environment variable DEBUG=botium-connector-webdriverio\*) screenshots are saved to the local directory on failure*

### WEBDRIVERIO_START_SELENIUM and WEBDRIVERIO_START_SELENIUM_OPTS
_Default: false_

_Default opts: none (use default options)_

Start the integrated Selenium server automatically.

The options are handed over to Selenium-standalone 1:1 - see [here](https://github.com/vvo/selenium-standalone#example) for examples how to adapt it to your driver versions.

### WEBDRIVERIO_START_CHROMEDRIVER and WEBDRIVERIO_START_CHROMEDRIVER_ARGS
_Default: false_

_Default args: --port=4444 --url-base=wd/hub_

Start the a headless Chrome browser automatically
