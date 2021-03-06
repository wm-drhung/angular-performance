/*
 File that will be injected in the page by the content script in order to retrieve angular
 performance metrics.

 Heavily inspired by:
 - ng stats
 - ng inspector
 - Angular Inspector
 - Batarang

 */
(function() {
  'use strict';

  console.log('angular-performance - Inspector loaded into webpage');

  if (document.readyState === 'complete'){
    console.log('Ready state complete');
    detectAngular();
  } else {
    console.log('Ready state not complete');
    window.onload(detectAngular)
  }

  /**
   * If angular is detected, bootstraps the inspector
   */
  function detectAngular(){
    if (typeof angular !== 'undefined') {

      window.postMessage({
        task: 'initDevToolPanel',
        source: 'angular-performance'
      }, '*');

      bootstrapInspector();
    }
  }

  /**
   * Function to set up all listeners and data mining tools
   */
  function bootstrapInspector(){

    console.log('inspector.js - bootstrapping application');

    var $rootScope = getRootScope();
    var scopePrototype = Object.getPrototypeOf($rootScope);
    var oldDigest = scopePrototype.$digest;

    scopePrototype.$digest = function $digest() {
      var start = performance.now();
      oldDigest.apply(this, arguments);
      var time = (performance.now() - start);
      report('DigestTiming', {
        timestamp: Date.now(),
        time: time
      });
    };

    initWatcherCount();
  }

  /**
   * Function to be called once to init the watcher retrieval.
   */
  function initWatcherCount(){
    report('RootWatcherCount', {
      timestamp: Date.now(),
      watcher:{
        watcherCount: getWatcherCountForScope(),
        location: window.location.href
      }
    });
    setTimeout(initWatcherCount, 300);
  }

  /**
   * Retrieves the watcher count for a particular scope
   *
   * @param {angular.scope} [$scope] - angular scope instance
   * @returns {number}               - angular scope count
   */
  function getWatcherCountForScope($scope) {
    var count = 0;
    iterateScopes($scope, function($scope) {
      count += getWatchersFromScope($scope).length;
    });
    return count;
  }

  /**
   * Apply a function down the angular scope
   *
   * @param {angular.scope} [current] - current angular $scope
   * @param {Function}      fn        - function to apply down the scope
   * @returns {*}
   */
  function iterateScopes(current, fn) {
    if (typeof current === 'function') {
      fn = current;
      current = null;
    }
    current = current || getRootScope();
    current = makeScopeReference(current);
    if (!current) {
      return;
    }
    var ret = fn(current);
    if (ret === false) {
      return ret;
    }
    return iterateChildren(current, fn);
  }

  /**
   * Apply a function on a scope siblings (same scope level) and down to their children
   *
   * @param {angular.scope} start - starting scope of the iteration
   * @param {Function}      fn    - function to be applied on the different scopes
   * @returns {*}
   */
  function iterateSiblings(start, fn) {
    var ret;
    while (!!(start = start.$$nextSibling)) {
      ret = fn(start);
      if (ret === false) {
        break;
      }

      ret = iterateChildren(start, fn);
      if (ret === false) {
        break;
      }
    }
    return ret;
  }

  /**
   * Apply a function on all the children scopes and their respective siblings
   *
   * @param {angular.scope} start - start node of the
   * @param {Function}      fn    - function to apply
   * @returns {*}
   */
  function iterateChildren(start, fn) {
    var ret;
    while (!!(start = start.$$childHead)) {
      ret = fn(start);
      if (ret === false) {
        break;
      }

      ret = iterateSiblings(start, fn);
      if (ret === false) {
        break;
      }
    }
    return ret;
  }


  /**
   * Gets the angular root scope
   *
   * @returns {angular.scope}
   */
  function getRootScope(){
    if (typeof $rootScope !== 'undefined') {
      return $rootScope;
    }
    var scopeEl = document.querySelector('.ng-scope');
    if (!scopeEl) {
      return null;
    }
    return angular.element(scopeEl).scope().$root;
  }

  /**
   * Retrieve all watchers from a scope
   *
   * @param {angular.scope} scope - angular scope to get the watchers from
   * @returns {Array}
   */
  function getWatchersFromScope(scope) {
    return scope && scope.$$watchers ? scope.$$watchers : [];
  }

  /**
   * Gets the id of a scope
   *
   * @param {angular.scope} scope - angular scope to get the id from
   * @returns {angular.scope}
   */
  function makeScopeReference(scope) {
    if (isScopeId(scope)) {
      scope = getScopeById(scope);
    }
    return scope;
  }

  /**
   * Gets the scope from an ID
   *
   * @param {String|Number} id - scope id
   * @returns {angular.scope}
   */
  function getScopeById(id) {
    var myScope = null;
    iterateScopes(function(scope) {
      if (scope.$id === id) {
        myScope = scope;
        return false;
      }
    });
    return myScope;
  }

  /**
   * Check if the scope passed as an argument is an id or not.
   *
   * @param {angular.scope} scope
   * @returns {boolean}
   */
  function isScopeId(scope) {
    return typeof scope === 'string' || typeof scope === 'number';
  }

  /**
   * Reports a metric
   *
   * @param {String} variable - can be 'digestTiming'
   * @param {Object} value    -  value to be registered with the variable
   */
  function report(variable, value){
    window.postMessage({
      source: 'angular-performance',
      task: 'register'+variable,
      data: value
    }, '*');
  }
})();