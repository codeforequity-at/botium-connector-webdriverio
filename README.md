# Botium Connector for WebdriverIO scripts
Supports running Botium scripts on Websites with Webdriver, backed by a Selenium server.

If you don't have a Selenium server already installed (or access to a cloud based Selenium server like Saucelabs), you can use the scripts in this repository as a starter to either install a full-blown Selenium server, or just a small PhantomJS server.

## Installing and starting the Selenium server (with Chrome, Edge, Firefox)

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

## Installing and starting the Phantomjs server

As a very small replacement you can also start with [Phantomjs](http://phantomjs.org/), a headless browser. You won't need a separate Selenium installation in this case.

### Using the integrated PhantomJS server

Setting the capability "WEBDRIVERIO_START_PHANTOMJS" to true will make Botium start an integrated PhantomJS automatically (and stop it afterwards).

### Starting a separate Phantomjs server

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
