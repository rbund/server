/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */

(function() {

  "use strict";
  
  const URL = window.URL;
  
  function $constructor(url, shared) {
    if (this instanceof $constructor) {
      if (!url) throw new TypeError("missing url parameter");
      this.Shared = !!shared;
      if (shared) {
        this.Worker = new SharedWorker(url);
        this.Connector = 
      }
      this.Worker = new Worker(url);
    } else return(new $constructor(url));
  }
  
  const _fromfunction_regex = /^function .+\{?|\}$/g;
  $constructor.fromFunction = function(fn, shared) {
    if (typeof fn !== "function") throw new TypeError("function as parameter needed");
    var blob = new Blob([fn.toString().replace(_fromfunction_regex,"")], {"type": "text/javascript"});
    return new this(URL.createObjectURL(blob), shared);
  }
  
  $constructor.fromDocument = function(selector, shared, index) {
    var ix = index|0;
    var blob = new Blob([document.querySelectorAll(selector)[ix].textContent], {"type": "text/javascript"});
    return new this(URL.createObjectURL(blob), shared);
  }
  
  $constructor.fromDocumentAll = function(selector, shared) {
    var blob = new Blob(document.querySelectorAll(selector).map( e=>e.textContent), {"type": "text/javascript"});
    return new this(URL.createObjectURL(blob), shared);
  }
      
  if (Units) Units.register("labour", $constructor, {
     author: "rbund"
    ,version: "beta"
  });
  
})();