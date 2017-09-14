/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */

(function() {

  "use strict";
  function main (Lib) {
  
    const URL = window.URL;
    const MessageManager = Lib.messagemanager;
    const Worker = Lib.Worker;
    const SharedWorker = Lib.SharedWorker;
    
    // constructor
    
    /**
     *
     * possible options:
     * shared : {boolean} - true for SharedWorker
     *
     */
    function $constructor(url, options) {
      var opt = options||{};
      if (this instanceof $constructor) {
        if (!url) throw new TypeError("missing url parameter");
        MessageManager.create(this);        
        this.Shared = !!opt.shared;
        if (this.shared) {
          this.Worker = new SharedWorker(url);
          //this.Connection = this.Worker.port;
          // MERKE: Besonderheiten einpflegen
        }
        else
        {
          this.Worker = new Worker(url);
          this.Port = this.Worker;
        }
        this.addMessageSource(this.Port, "message");
        
      } else return(new $constructor(url));
    }
    
    // prototype
    $constructor.prototype = {
    
      translateMessage : function (args) {
        // stringify the message
        var msg = JSON.parse(args[1].data);
        return (Array.isArray(msg) ? msg : [msg]);
      }
      
      ,postMessage : function () {
        var msg = JSON.stringify(arguments);
        this.Port.postMessage(msg);
      }
    };
    
    const _fromfunction_regex = /^function .+\{?|\}$/g;
    $constructor.fromFunction = function(fn, options) {
      if (typeof fn !== "function") throw new TypeError("function as parameter needed");
      var blob = new Blob([fn.toString().replace(_fromfunction_regex,"")], {"type": "text/javascript"});
      return new this(URL.createObjectURL(blob), options);
    }
    
    // static class functions
    
    $constructor.fromDocument = function(selector, options, index) {
      var ix = index|0;
      var blob = new Blob([document.querySelectorAll(selector)[ix].textContent], {"type": "text/javascript"});
      return new this(URL.createObjectURL(blob), options);
    }
    
    $constructor.fromDocumentAll = function(selector, options) {
      var blob = new Blob(document.querySelectorAll(selector).map( e=>e.textContent), {"type": "text/javascript"});
      return new this(URL.createObjectURL(blob), options);
    }
        
    Units.register("labour", $constructor, {
       author: "rbund"
      ,version: "beta"
    });
  }
  
  // defining fake units
  if (window.Worker) Units.register("Worker", window.Worker);
  if (window.SharedWorker) Units.register("SharedWorker", window.SharedWorker);
  
  Units.uses(["messagemanager", "Worker", "SharedWorker"])
  .then( main )
  .catch( (e) => console.error(e) );
  
})();