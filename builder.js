// Copyright 2011 Software Freedom Conservancy. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var base = require('./_base'),
    executors = require('./executors');

var goog = base.require('goog'),
    AbstractBuilder = base.require('webdriver.AbstractBuilder'),
    Browser = base.require('webdriver.Browser'),
    Capability = base.require('webdriver.Capability'),
    WebDriver = base.require('webdriver.WebDriver'),
    promise = base.require('webdriver.promise');


/**
 * @param {!webdriver.Capabilities} capabilities The desired capabilities.
 * @param {webdriver.promise.ControlFlow} flow The control flow to use, or
 *     {@code null} to use the currently active flow.
 * @return {webdriver.WebDriver} A new WebDriver instance or {@code null}
 *     if the requested browser is not natively supported in Node.
 */
function createNativeDriver(capabilities, flow) {
  switch (capabilities.get(Capability.BROWSER_NAME)) {
    case Browser.CHROME:
      // Requiring 'chrome' above would create a cycle:
      // index -> builder -> chrome -> index
      var chrome = require('./chrome');
      return chrome.createDriver(capabilities, null, flow);

    case Browser.PHANTOM_JS:
      // Requiring 'phantomjs' would create a cycle:
      // index -> builder -> phantomjs -> index
      var phantomjs = require('./phantomjs');
      return phantomjs.createDriver(capabilities, flow);

    default:
      return null;
  }
}



/**
 * Creates new {@link webdriver.WebDriver WebDriver} instances.
 * @constructor
 * @extends {webdriver.AbstractBuilder}
 */
var Builder = function() {
  goog.base(this);

  /** @private {webdriver.promise.ControlFlow} */
  this.flow_ = null;
};
goog.inherits(Builder, AbstractBuilder);


/**
 * Sets the proxy configuration to use for WebDriver clients created by this
 * builder. Any calls to {@link #withCapabilities} after this function will
 * overwrite these settings.
 * @param {!proxy.ProxyConfig} config The configuration to use.
 * @return {!Builder} A self reference.
 */
Builder.prototype.setProxy = function(config) {
  this.getCapabilities().set(Capability.PROXY, config);
  return this;
};


/**
 * Sets Chrome-specific options for drivers created by this builder.
 * @param {!chrome.Options} options The ChromeDriver options to use.
 * @return {!Builder} A self reference.
 */
Builder.prototype.setChromeOptions = function(options) {
  var newCapabilities = options.toCapabilities(this.getCapabilities());
  return /** @type {!Builder} */(this.withCapabilities(newCapabilities));
};


/**
 * Sets the control flow that created drivers should execute actions in. If
 * the flow is never set, or is set to {@code null}, it will use the active
 * flow at the time {@link #build()} is called.
 * @param {webdriver.promise.ControlFlow} flow The control flow to use, or
 *     {@code null} to 
 * @return {!Builder} A self reference.
 */
Builder.prototype.setControlFlow = function(flow) {
  this.flow_ = flow;
  return this;
};


/**
 * @override
 */
Builder.prototype.build = function() {
  var url = this.getServerUrl();

  // If a remote server wasn't specified, check for browsers we support
  // natively in node before falling back to using the java Selenium server.
  if (!url) {
    var driver = createNativeDriver(this.getCapabilities(), this.flow_);
    if (driver) {
      return driver;
    }

    // Nope, fall-back to using the default java server.
    url = AbstractBuilder.DEFAULT_SERVER_URL;
  }

  var executor = executors.createExecutor(url);
  return WebDriver.createSession(executor, this.getCapabilities(), this.flow_);
};


// PUBLIC API


exports.Builder = Builder;
