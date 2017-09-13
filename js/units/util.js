/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */

(function() {

  "use strict";
  
  var util = {
  
      "undefined" : (()=>{})()
      
      
      /***
       * Copies an array or array like object to an array.
       * When fromix is negative, it will be added to length.
       * When fromix is not given, 0 is taken as fromix.
       * When count is not given, all elements starting with
       * fromix will be copied.
       *
       * @param {array} src - the array to copy
       * @param {int} fromix - first index to to copy from
       * @param {int} count - number of elements to copy
       */
      ,copyArray : function(src, fromix, count) {
        var s = src instanceof Object ? src : Object(src);
        var len = s.length|0,
            $from = fromix < 0 ? Math.max(0,len + fromix) : fromix|0,
            maxlen = len-$from,
            $count = count ? Math.min(count, maxlen) : maxlen,
            res = new Array($count);
        for (var i = 0, j = $from; i < $count; i++, j++) res[i] = s[j];
        return res;
      }

      
      /***
       * Merges source objects own properties to a target object.
       * Existing properties will be overwritten. The latter the source
       * object, the higher the priority of the source object.
       *
       * @param {object} target - the target object
       * @param {object} 1 - first source object
       * ...
       * @param {object} n - the last source object
       * @return {object} - merged target
       */
      ,mergeObjects : function (target) {
        var res = target||{};
        if (res instanceof Object) {
          for (var i = 1, len = arguments.length; i < len; i++) {
            var s = arguments[i] instanceof Object ? arguments[i] : {};
            for (var key in s) s.hasOwnProperty(key) && (res[key] = s[key]);
          }
        }
        return(res);
      }

      /***
       * Merges two arrays to a new one.
       * Will remove doubles when not otherwise specified.
       *
       * @param {array} a1 - first array to merge
       * @param {array} a2 - second array to merge
       * @param {boolean} allowdoubles - keeps doubles when set to true, default: false
       * @return {array} a new merged array
       */
      ,mergeArrays : function (a1, a2, allowdoubles) {
        if (Array.isArray(a1) && Array.isArray(a2)) {
          var res = a1.slice(0);
          for (var i = 0, len = a2.length; i < len; i++)
            if (allowdoubles || res.indexOf(a2[i]) < 0) res.push(a2[i]);
          return(res);
        }
      }

      
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
        var c = (this.typeOfEx($type) === "string") ? 0 : 1;
        for (var i = 1, len = arguments.length; i < len; i++) {
          var a = arguments[i], at = this.typeOfEx(a);
          if (c) { // $type used ot be an object
            if (!(a instanceof Object)) return 0;
            for (var key in $type)
              if (!this.checkType($type[key], a[key])) return 0;
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
  });
  
})();