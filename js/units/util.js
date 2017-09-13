/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */

(function() {

  "use strict";
  
  var util = {
  
      undefined = (()=>{})()
      
      /**
       * Similar to 'typeof', but returns a more exact type of the given
       * argument 'what'.
       *
       * Possible results: 'object','string','array','function','null',
       * 'undefined','integer', 'float', 'nan', 'infinity', 'boolean' and
       * possibly more.
       * When additional parameters are given, then they are compared
       * to the type of 'what' and true is returned when any additional
       * equals to the first parameters type, otherwise false.
       *
       * @param  {any} what - the variables type to analyze
       * --- optional:
       * @param {string} param 2 - a type to compare with
       * ...
       * @param {string} param n - a type to compare with
       * @return {string||boolean} - the type when only one parameter is
       * given. On more parameters, true when the type was found, otherwise
       * false.
       */
      ,typeOfEx : function (what) {
        var s = Object.prototype.toString.call(what);
        s = s.slice(8,s.length-1).toLowerCase();
        // number extension!
        if (s === "number") {
          s = Number.isFinite(what) ? ((what|0) === what ? "integer" : "float") :
              (what === Infinity ? "infinity" : "nan");
        } // else if (s instanceof Object && !what) s = "null";
        if (arguments.length == 1) return(s);
        for (var i = 1, len = arguments.length; i < len; i++)
          if (s == arguments[i]) return(true);
        return(false);
      }
      
      /**
       * Verifies if a given parameter is of a certain type.
       * When type definition is a string the type check
       * is done in accordance to typeOfEx(). When type
       * definition is an object, the parameters are checked
       * whether they are objects to and if so, any property
       * of the type definition is check by calling checkType()
       * recursively.
       *
       * WARNING: will trigger stack overflow when the type
       * definition includes a reference on itself!
       *
       * @param {object|string} $type - type to check
       * @param {...args} parameters to check
       * @return 1 if all parameter comply to type, else 0
       */
      ,checkType : function ($type) {
        var c = (typeOfEx($type) === "string") ? 0 : 1;
        for (var i = 1, len = arguments.length; i < len; i++) {
          var a = arguments[i], at = typeOfEx(a);
          if (c) { // $type used ot be an object
            if (!(a instanceof Object)) return 0;
            for (var key in $type)
              if (!checkType($type[key], a[key])) return 0;
          }
          else if (at !== $type) return 0;
        }
        return len > 1 ? 1: 0;
      }
      
      /***
       * Returns a formatted string based on given pattern and
       * additional parameters. Additional paramters are inserted into the
       * string when the parameters index is specified within curly
       * brackets.
       * The first additional paramter starts with index 1, but index 0 may
       * be used to insert the pattern.
       *
       * Example 1:
       * util.format("Hello {1}", "world") returns "Hello world".
       *
       * Example 2:
       * util.format("Hello {0}") returns "Hello Hello {0}".
       *
       * @param  {string} pattern - the pattern to use
       * @param {string} value 1 - value to insert
       * ...
       * @param {string} value n - value to insert
       * @return {string} - the filled pattern
       */
      ,format : function (pattern) {
        var args = arguments;
        return pattern.replace(/{(\d+)}/g, function(match, number) { 
          return typeof args[number] != 'undefined' ? args[number] : match ;
        })
      }
  };
  
  if (Units) Units.register("util", util, {
     author: "rbund"
    ,version: "1.0.0"
  });
  
})();