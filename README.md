# Botium Connector for WebdriverIO scripts

[![NPM](https://nodei.co/npm/botium-connector-webdriverio.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-webdriverio/)

[ ![Codeship Status for codeforequity-at/botium-connector-webdriverio](https://app.codeship.com/projects/5a00af50-a179-0136-73f5-0e24fd8eaa40/status?branch=master)](https://app.codeship.com/projects/306730)
[![npm version](https://badge.fury.io/js/botium-connector-webdriverio.svg)](https://badge.fury.io/js/botium-connector-webdriverio)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

Supports running [Botium](https://github.com/codeforequity-at/botium-core) scripts on Websites with Webdriver, backed by a Selenium server.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

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

An installed and running Selenium server is required. If you don't have a Selenium server already installed (or access to a cloud based Selenium server like Saucelabs), you can use the scripts in this repository as a starter to either install a full-blown Selenium server, or just a small PhantomJS server.

### Installing and starting the Selenium server (with Chrome, Edge, Firefox)

As a starter, this repository includes scripts for installing and starting a Selenium server with the help of [selenium-standalone](https://github.com/vvo/selenium-standalone)-package. 

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

Start the Selenium server:

```
> npm run selenium
```

With this running Selenium server you can now run the Botium samples.

### Installing and starting the Phantomjs server

As a very small replacement you can also start with [Phantomjs](http://phantomjs.org/), a headless browser. You won't need a separate Selenium installation in this case.

#### Using the integrated PhantomJS server

Setting the capability "WEBDRIVERIO_START_PHANTOMJS" to true will make Botium start an integrated PhantomJS automatically (and stop it afterwards).

#### Starting a separate Phantomjs server

After cloning the repository (see above), just run this command to start PhantomJS server:

```
> npm run phantomjs
```

You can run the Botium samples with this PhantomJS server now - but be aware that some websites don't work well with PhantomJS.

## Preparation Steps: Analyze Chatbot Widget

If you ever worked with Selenium, you are aware that writing an automation script usually is a time-consuming task. This Botium connector helps you in writing automation scripts for a chatbot widget embedded on a website and speeds up the development process by making reasonable assumptions:
* There maybe is some kind of click-through to actually __open the chatbot__
* The chatbot has an __input text field__, or some buttons to click (however it looks)
* The chatbot outputs reponses in some kind of __list within a window__ (however it looks)

All those assumptions can be parameterized for adapting it to your actual chatbot website with Botium capabilities:

* _WEBDRIVERIO_URL_ to point to the website to launch for accessing the chatbot
* _WEBDRIVERIO_INPUT_ELEMENT_, the (Webdriver selector)[https://webdriver.io/docs/selectors.html] for the input text field
* _WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON_, the (Webdriver selector)[https://webdriver.io/docs/selectors.html] for the "Send"-Button (if present, otherwise message to the chatbot is sent with "Enter" key)
* _WEBDRIVERIO_OUTPUT_ELEMENT_, the (Webdriver selector)[https://webdriver.io/docs/selectors.html] for the chatbot output elements

If there are additional steps (mouse clicks) to do on the website before the chatbot is accessible, you will have to extend the pre-defined Selenium scripts with custom behaviour (see below).

For some common chatbot widgets and websites, Botium provides out-of-the-box Selenium scripts by setting the Botium capability __WEBDRIVERIO_PROFILE__ to one of the pre-defined Selenium scripts.

### botbuilder_webchat - Microsoft Bot Framework Webchat
For chatbots published with the [Bot Framework Webchat Widget](https://github.com/Microsoft/BotFramework-WebChat). Point the capability _WEBDRIVERIO_URL_ to the full URL of the website where the widget is embedded.

### dialogflow_com - Dialogflow Web Demo Chatbot
For chatbots published as Dialogflow "Web Demo". Point the capability _WEBDRIVERIO_URL_ to the full URL of the embedded Dialogflow Web Demo (for example: "https://console.dialogflow.com/api-client/demo/embedded/d388ac41-5c60-483f-b89b-0ec0d99d848d").

### messenger_com - Facebook Messenger Chatbot (experimental)
For chatbots published in (Facebook Messenger)[https://www.messenger.com].

* Point the capability _WEBDRIVERIO_URL_ to the full URL of the chatbot page (for example: "https://www.messenger.com/t/1271293572983985").
* Additionally, set the capabilities _WEBDRIVERIO_USERNAME_ and _WEBDRIVERIO_PASSWORD_ to your Facebook credentials

## Customize pre-defined Selenium Scripts
While the pre-defined Selenium scripts make reasonable assumptions, it is not unusual that your chatbot widget and your website has some very special behaviour to address. In those cases, there are some Selenium- and Node.js-Coding skills required.

Customization is done by injection Node.js-Code into Botium. The code to executed is injected by providing a capability to Botium. The capability can contain:

* a pointer to a _Javascript Function_ (not possible when configuration is done in _botium.json_ file)
* the name of an _NPM Package_, which exports a single function
* a _Javascript file name_ relative to the current working directory, which exports a single function
* _Javascript code_ to be compiled and executed

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
* Send "Enter" or simulate button click

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
        "desiredCapabilities": {
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
        "desiredCapabilities": {
          "deviceName": "Samsung Galaxy S6 GoogleAPI Emulator",
          "platformName": "Android",
          "platformVersion": "7.0",
          "browserName": "Chrome",
          "name": "Banking Chatbot Tests",
          "tags": "botium, chatbot",
          "username": "xxx",
          "accessKey": "xxxxx"
        },
        "host": "ondemand.saucelabs.com",
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
> npm install && node botiumFluent.js
```

(This sample will use the integrated PhantomJS server)

Check the botium.json files in the sample directories for setting up the browser to use for the Botium conversation. You maybe have to tune the Selenium capabilities in the botium.json file - again, in case of troubles with Selenium, this project is not the right place to ask.

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __webdriverio__ to activate this connector.

### WEBDRIVERIO_OPTIONS
### WEBDRIVERIO_URL
### WEBDRIVERIO_PROFILE
### WEBDRIVERIO_OPENBROWSER
### WEBDRIVERIO_OPENBOT
### WEBDRIVERIO_OPENBOTPAUSE
### WEBDRIVERIO_SENDTOBOT
### WEBDRIVERIO_RECEIVEFROMBO
### WEBDRIVERIO_GETBOTMESSAGE
### WEBDRIVERIO_INPUT_ELEMENT
### WEBDRIVERIO_INPUT_ELEMENT_VISIBLE_TIMEOUT
### WEBDRIVERIO_INPUT_ELEMENT_SENDBUTTON
### WEBDRIVERIO_OUTPUT_ELEMENT
### WEBDRIVERIO_IGNOREUPFRONTMESSAGES
### WEBDRIVERIO_IGNOREWELCOMEMESSAGES
### WEBDRIVERIO_USERNAME
### WEBDRIVERIO_PASSWORD
### WEBDRIVERIO_SCREENSHOTS
### WEBDRIVERIO_VIEWPORT_SIZE
### WEBDRIVERIO_START_PHANTOMJS
