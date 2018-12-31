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

If you don't have a Selenium server already installed (or access to a cloud based Selenium server like Saucelabs), you can use the scripts in this repository as a starter to either install a full-blown Selenium server, or just a small PhantomJS server.

### Installing and starting the Selenium server (with Chrome, Edge, Firefox)

An installed and running Selenium server is required. As a starter, this repository includes scripts for installing and starting a Selenium server with the help of [selenium-standalone](https://github.com/vvo/selenium-standalone)-package. 

First, you have to install a recent Java Runtime Environment - see [here](https://github.com/vvo/selenium-standalone#ensure-you-have-the-minimum-required-java-version) for required versions. An of course, you need Node.js and Git client.

Clone the repository:

`> git clone https://github.com/codeforequity-at/botium-connector-webdriverio.git`

Install requirements, Selenium server and drivers for the most common browsers

```
> npm install
> npm run selenium-install
```

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

## Running the samples

```
> cd samples/dialogflow
> npm install && node botiumFluent.js
```

(This sample will use the integrated PhantomJS server)

Check the botium.json files in the sample directories for setting up the browser to use for the Botium conversation. You maybe have to tune the Selenium capabilities in the botium.json file - again, in case of troubles with Selenium, this project is not the right place to ask.
