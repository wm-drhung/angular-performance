'use strict';

// Mapping of the connections between the devtools and the tabs
var
  devToolsConnections = {},
  panelConnections = {};

// Handles connections
chrome.runtime.onConnect.addListener(function(port){

  /**
   * Listener for the devtools panel messages.
   *
   * @param {Object}        message       message sent from the devtools
   * @param {Object}        message.task  task to execute
   */
  var devToolsListener = function(message){

    switch (message.task){
      case 'init':
        console.log('Dev Tools listener initialized '+message.tabId);
        devToolsConnections[message.tabId] = port;
        break;
      case 'log':
        if (message.obj) {
          console.log('devtools.js - ' + message.text, message.obj);
        } else {
          console.log('devtools.js - ' + message.text);
        }
        break;
      case 'injectContentScript':
        console.log('devtools.js - Injecting content script');
        chrome.tabs.executeScript(message.tabId, {
          file: 'src/injected/content-script.js'
        });
        break;
      default:
        console.log('devtools.js - Received unknown task: ' + message.task);
    }
    return true;
  };

  /**
   * Listener for the content Script.
   *
   * @param {Object}        message       message sent from the devtools
   * @param {Object}        message.task  task to execute
   * @param {Port}          port          port
   */
  var contentScriptListener = function(message, port){

    var sender = port.sender;

    if(message.task === 'log'){
      if (message.obj) {
        console.log('content-script.js - ' + message.text, message.obj);
      } else {
        console.log('content-script.js - ' + message.text);
      }
      return;
    }

    if (sender.tab) {
      var tabId = sender.tab.id;

      if (message.task === 'initDevToolPanel' && tabId in devToolsConnections) {
        devToolsConnections[tabId].postMessage(message);
      } else if (tabId in panelConnections) {
        panelConnections[tabId].postMessage(message);
      } else {
        console.log('background.js - Tab not found in connection list.');
      }
    } else {
      console.log('background.js - sender.tab not defined.');
    }
    return true;
  };

  /**
   * Listener for the panel inserted n the devtools (we cannot communicate directly between the
   * devtool page and the panel (weird)
   *
   * @param {Object} message
   */
  var panelListener = function(message){
    if (message.task === 'init'){
      console.log('background.js - panel listener initialized ', message.tabId);
      panelConnections[message.tabId] = port

    } else if (message.task === 'log'){
      if (message.obj) {
        console.log('panel.js - ' + message.text, message.obj);
      } else {
        console.log('panel.js - ' + message.text);
      }
    }
  };

  /*
      Bindings
   */

  if (port.name === 'devtools-page'){
    console.log('background.js - devtools listener setup');

    // add the listener
    port.onMessage.addListener(devToolsListener);

    // Removes the listener on disconnection and cleans up connections
    port.onDisconnect.addListener(function() {
      port.onMessage.removeListener(devToolsListener);

      var tabs = Object.keys(devToolsConnections);
      for (var i=0, len=tabs.length; i < len; i++) {
        if (devToolsConnections[tabs[i]] == port) {
          delete devToolsConnections[tabs[i]];
          break;
        }
      }
    });


  } else if (port.name === 'content-script'){

    console.log('background.js - content script listener setup');
    port.onMessage.addListener(contentScriptListener);

    port.onDisconnect.addListener(function(){
      port.onMessage.removeListener(contentScriptListener);
    });


  } else if (port.name === 'angular-performance-panel'){

    port.onMessage.addListener(panelListener);

    // Removes the listener on disconnection and cleans up connections
    port.onDisconnect.addListener(function() {
      port.onMessage.removeListener(panelListener);

      var tabs = Object.keys(panelConnections);
      for (var i=0, len=tabs.length; i < len; i++) {
        if (panelConnections[tabs[i]] == port) {
          delete panelConnections[tabs[i]];
          break;
        }
      }
    });
  }
});
