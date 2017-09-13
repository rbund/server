/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */
 
  /**
    
    Usage
    ========
    Using (including) units is done by calling
    
      Units.uses(["unit","unit2 in xyz",...], function)
      
    Once all units and their dependecies are loaded and initialized function is called.
    Units have to register themselves by calling
    
      Units.register(id, exports)
    
    Methodic
    ========

    When units are used via uses(), the following flow shall be processed:
    
    1. check all used units for their status. if the status is
      not existant: 
        create an entry, status is used
    
   **/


(function(Global) {
  "use strict";

  // Globals
  
  var
    UnitRegex = /^(\S+?)(?:\s+in\s+(.+))?$/
    ,Units = {}
    ,Dependencies = []
    ,UnitPath = ""
  ;

  
  /**
   * Returns a reference to the script element of the current context.
   */
  function getCurrentScript() {
    if (Global.document) return (Global.document.currentScript || Global.document.scripts[Global.document.scripts.length-1]);
    return null;
  }
  function getCurrentScriptData(key) {
    var cs = getCurrentScript();
    if (cs) return cs.getAttribute(key);
  }
  
  /**
   * Returns a new array with all intersecting elements.
   * Any element which is in both arrays is part of the
   * resulting array. Doubles are removed (e.g. when an element
   * exists multiple times).
   *
   * @param {array} a - first source array
   * @param {array} b - second source array
   * @return {array} intersection array
   */
  function intersectArray(a,b) {
    var res = [], v;
    for (var i = 0, len = a.length; i < len; i++) {
        v = a[i];
        if (b.indexOf(v) >= 0 && res.indexOf(v) < 0) res.push(v);
    }
    return res;
  }
  
  /**
   * Merges two arrays and returns the new merged array.
   * Doubles are removed.
   *
   * @param {array} a - first source array
   * @param {array} b - second source array
   * @return {array} merged array
   */
  function mergeArrays(a,b) {
    var res = a.slice(0);
    for (var i = 0, len = b.length; i < len; i++)
      if (a.indexOf(b[i]) < 0) res.push(b[i]);
    return res;
  }
  
  /**
   * Event handler on loading error.
   * Is called when script loading via script element fails.
   *
   * @param {object} e - an event object}
   */
  function loadErrorEvent(e) {
    var id = e.target.getAttribute("data-unitid");
    console.warn("Error loading unit \""+ id +"\"");
    var u = Units[id];
    if (u) {
      u.exports = null;
      u.done = true;
      u.error = "load error";
      unitRegistered(id);
    }
  }
  
  /**
   * Initiates script loading.
   * The definition object should contain unit ids as keys
   * and unit urls as values.
   *
   * @param {object} def - scripts to load
   * @return {boolean} true if nothing to load, otherwise false
   */
  function loadScripts(def) {
    var hrefs = [];
    for (var key in def) {
      Units[key] = {"type" : "external", "href": def[key]};
      hrefs = def[key];
    }
    if (hrefs.length) {
      if (typeof Global.importScripts === "function") {
        Global.importScripts.apply(Global, hrefs);
      } else {
        var CurrentScript = getCurrentScript(),
            s = null;
        for (var key in def) {
          s = document.createElement("script");
          s.setAttribute("src", def[key]);
          s.setAttribute("data-unitid", key);
          s.setAttribute("type", "text/javascript");
          s.setAttribute("async", "true");
          //s.onload = f;
          s.onerror = loadErrorEvent;
          CurrentScript.parentElement.insertBefore(s, CurrentScript);
        }
      }
    } else return true;
    return false;
  }
  
  /**
   * Checks for cyclic dependencies of an entry.
   *
   * @param {object} entry - the entry to check
   * @return {string} unit id the entry has an cyclic dependency to. otherwise undefined
   */
  function checkCyclicDependency(entry) {
    var i = 0, waitfor = entry.waitfor.slice(0), ctx = entry.context;
    while (i < waitfor.length) {
      var u = waitfor[i];
      for (var j = 0; j < Dependencies.length; j++) {
        if (Dependencies[j].context === u) {
          if (Dependencies[j].needs.indexOf(ctx) >= 0) return u;
          waitfor = mergeArrays(waitfor, Dependencies[j].needs);
        }
      }
      i++;
    }
  }
  
  /**
   * Returns an object with references to specified units.
   * The resulting object contains unit ids as keys and unit
   * references as values.
   * When a unit is not available it is still listed in the
   * resulting object but with a null value as reference.
   *
   * @param {string...} unit ids of units to retrieve
   * @return {object} unit ids / unit exports of asked for units
   */
  function getUnit() {
    var res = {}, last = null;
    for (var i = 0; i < arguments.length; i++) {
      last = Units[arguments[i]];
      res[arguments[i]] = (last = (last && last.done) ? last.exports : null);
    }
    if (i < 2) return last;
    return res;
  }
  
  /**
   * Executes a dependency procedure.
   *
   * @param {object} entry - the dependency entry to execute
   * @return {any} return value of the execution or false if the procedure isn't a function
   */
  function execDependency(entry) {
    if (typeof entry.Proc === "function")
      entry.Result = entry.Proc(getUnit.apply(null, entry.needs));
    else
      entry.Result = false;
    return entry.Result;
  }
  
  /**
   *
   * Throws an exception when a cyclic dependency is detected.
   */
  function addDependency( units, fn) {
    var notloaded = {}, entry = { Proc: fn, needs: [], waitfor: [], context: getCurrentScriptData("data-unitid")|| "MAIN" };
    for (var key in units) {
      entry.needs.push(key);
      if (! Units[key]) {
        entry.waitfor.push(key);
        notloaded[key] = units[key];
      } else if (! Units[key].done) entry.waitfor.push(key);
    }
    var cyclic = checkCyclicDependency(entry);
    if (cyclic) throw new Error("cyclic dependency detected: "+entry.context+" to "+cyclic+" to "+entry.context);
    
    Dependencies.push(entry);
    if (loadScripts(notloaded)) {
      // dependency fulfilled
      if (entry.waitfor.length === 0) execDependency(entry)
    };
  }

  /**
   *
   */
  function unitRegistered(unitid) {
    for (var i = 0; i < Dependencies.length; i++) {
      var d = Dependencies[i], ix = -1;
      if ((ix = d.waitfor.indexOf(unitid)) >= 0) {
        d.waitfor.splice(ix,1);
        if (d.waitfor.length === 0) execDependency(d);
      }
    }
  }
  
  /**
   *
   */  
      Global.Units = {

        setUnitPath : function (apath) {
          var s = apath ? (apath + (apath.slice(-1) === '/' ? "" : '/')) : "";
          UnitPath = s;
        },
        /**
         * Sets the default extension for units when no
         * source file name is specified.
         *
         * @param {string} extension - the extension to use
         */
        setDefaultExtension : function (extension) {
          this.Extension = extension ? (extension[0] === '.' ? e : '.'+e) : "";
        },
        
        /**
         * Registers an unit.
         *
         * Only those details are stored which do not collide with existing keys.
         * Reserved keys are:
         *
         * type -
         * done -
         * exports -
         * href -
         * error -
         *
         * @param {string} id - the units id to register
         * @param {any} _exports - the units export
         * @param {object} details - additional unit details to be stored
         */
        register : function (id, _exports, details) {
          var u = Units[id];
          if (! u) u = (Units[id] = { "type": "generic"});
          if (u.done) console.warn("Overwriting loaded unit:",id);
          u.exports = _exports;
          u.done = true;
          if (details && typeof details === "object") {
            var d = u.details||{};
            for (var key in details)
              if (!(key in d)) d[key] = details[key];
            u.details = d;
          }
          unitRegistered(id);
        },
        
        /**
         * Notifies about units needed.
         * Unit loading is triggered when necessary.
         * A unit may by specified by "unitid in filename". The filename
         * is ignored when a unit with the according id is already available or
         * loading of the unit with that id was already triggered.
         * Once the units are available, `fn` is called together with an object 
         * containing all requested units are given as the only parameter.
         * When loading of an unit fails (e.g. wrong file name or not found),
         * a `null` value is given as value therefore.
         *
         * @param {string|array of string} defarray - unit ids which are needed
         * @param {function} fn - function to call when the needed units are available
         * @param {string} basepath - path to prepend when loading units
         */
        uses : function (defarray, fn, basepath) {
          var defa = Array.isArray(defarray) ? defarray : (defarray ? [defarray] : []),
              bp = basepath ? (basepath + basepath.slice(-1) === '/' ? '' : '/') : "",
              toload = {}; // holds the units to be loaded ({ unitid : href })
          for (var i = 0; i < defa.length; i++) {
            var parsearray = UnitRegex.exec(defa[i]), desc = {};
            if (parsearray) {
              var id = parsearray[1];
              toload[id] = UnitPath + bp + (parsearray[2] || (id + (this.Extension||".js")));
            }
          }
          addDependency(toload, fn);
        },
        /**
         * Returns an object with all units requested.
         *
         * @param {string|array of string} unit ids requested
         * @return {object} with unit id as key and unit exports as value
         */
        "getUnit" : getUnit,
        
        /**
         * Returns a list of all registered units.
         *
         * @return {array} array of all registered unit ids
         */
        listUnits : function () {
          return Object.keys(Units);
        },
        /**
         * Returns all details for a given unit.
         *
         * @param {string} id - the unit id of which details are requested.
         * @return {object} the units details or null when the unit is unknown
         */
        getUnitDetails : function (id) {
          var res = {}, u = Units[id];
          if (!u) return null;
          var d = u.details || {};
          for (var key in d) res[key] = d[key];
          for (var key in u) res[key] = u[key];
          return res;
        }
      };
      
})(window||self);