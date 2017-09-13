/*!
 * =====================================================
 * Copyright 2017 Rüdiger Bund
 * Lizenz / License: Bundsche Software Lizenz (BSL)
 * =====================================================
 */

/**
 * Message managing object.
 *
 * The message manager listens for messages and events from specified
 * message sources and dispatches it to registered listeners.
 * Aim of the message manager is to unify different sources by only
 * one interface. Message sources aren't restricted as long as an
 * according connector is available (registered).
 *
 * A connector is a specialized object which "understands" specific
 * event and message sources and is able to translate messages from
 * that source to the message manager.
 *
 * Connectors are registered globally and are added to instantiated
 * message managers when needed. When a connector is added to a message
 * manager, a new connector instance is created via Object.create()
 * and the connectors init() method is called.
 * A connector must comply to the IConnector interface (see below).
 * It is not yet forseen to be able to unregister once registered
 * connectors.
 * 
 * Among the connectors methods, the method canHandle() is special.
 * It is a static method which is called to evaluate, whether a
 * connector is needed for a specific message source (and added to a
 * message manager) or not. When calling canHandle(), the connector
 * has to indicate whether he is able to handle the given message source.
 *
 * The message manager isn't designed as singleton and thus, several
 * instance of message manager may be created.
 *
 * Example usage:
 *
 * var mm = MessageManager.create();
 * mm.addMessageSource(window, "click", "window_");
 * mm.on("window_click", function () { console.log("click", arguments); });
 *
 */

  (function () {
  
    "use strict";
    
    function implementation(util) {
    
      /**
       * Connector interface definition
       */
      const IConnector = {
        Name : "string",
        canHandle : "function",
        init: "function",
        addSource: "function",
        remSource: "function"
      };
      
      /**
       * Standard EventTarget interface defintition
       */
      const IEventTarget = {
        addEventListener: "function",
        removeEventListener: "function"
      };

      /**
       * Messagehandler interface definition
       */
      const IMessageHandler = {
        on : "function",
        off: "function",
        sendMessage: "function"
      };
      
      // Identifier of message type to catch all messages
      const CATCHALL = "*";
      // global storage for registered connectors
      const CONNECTORS = [];

      /**
       * Registers an message connector globally.
       * A message connector must comply to the IConnector interface.
       * Please note that connectors are used in the same row they are registered.
       * When registering the same connector twice, the second instance is probably
       * never called.
       *
       * @param {object} conn - the message connector to register
       * @return {int} - 1 on success, otherwise 0
       */
      function registerConnector(conn) {
        if ( ! util.checkType(IConnector, conn)) return 0;
        for (var i = 0; i < CONNECTORS.length; i++)
          if (CONNECTORS[i].Name === conn.Name) return 2;
        CONNECTORS.push(conn);
        return 1;
      }
      
      // base connector
      /**
       * Base connector in the meaning of a prototype.
       *
       * New Connectors should be derived from this object. It offers
       * basic functionalities for managing message sources.
       *
       * To do so some additional methods are supported, which must be
       * set or overwritten by a deriving object.
       *
       * These are:
       *
       * onInit() : called when init is called (optional)
       * onAddSource() : called, when addSource is called (mandatory)
       * onRemoveSource(): called, when removeSource is called (mandatory)
       *
       * The message manager offers the method createBaseConnector() for
       * retrieving a base connector instance. This instance must be extended
       * for creating a new connector and registered via registerMessageConnector()
       * to be in effect. That way user defined message source can be added to any
       * instance of a message manager.
       *
       */
      
      var BaseConnector = {

        /**
         * Initializes the connector.
         * This method is called at first after a connector is instantiated for
         * a message manager object. The only method which will be called without
         * calling init() previously is canHandle().
         * 
         * When initialization fails, the connector is not used any further.
         *
         * Creates property "Sources", where all registered messages sources
         * will be stored. Calls onInit() when available, will return 1 otherwise.
         *
         * @param {object} owner - the message manager the connector is added to
         * @return {boolean} true on initialization success, otherwise false
         */
        init: function (owner) {
          this.Owner = owner;
          this.Sources = new Map();
          if (typeof this.onInit === "function") return(this.onInit(owner));
          return 1;
        },

        /**
         * Adds a message source.
         * Message sources are stored in property "Sources".
         * Calls "onAddSource" and expects a source descriptor as result.
         * The source isn't added when no descriptor is returned.
         * The descriptor is also used when removing a message source.
         * 
         * The structure of "Sources" is:
         *
         * Sources
         * |
         * +- source object 1
         * |  +- message type 1
         * |  |  +- descriptor (defined by connector)
         * |  |
         * |  + ...
         * |  |
         * |  +- message type n
         * |     +- descriptor (defined by connector)
         * + ...
         * |
         * +- source object n
         *    +- message type 1
         *    |  +- descriptor (defined by connector)
         *    + ...
         *    |
         *    +- message type n
         *       +- descriptor (defined by connector)
         *
         * @param {object} source - the message source to add
         * @param {string} $type - the message/event type specifier (if any)
         * @param {string} modifier - an optional event type modifier (see modifyMessageType())
         * @return {int} 1 on success, otherwise 0
         */
        addSource : function (source, $type, modifier) {
          var s = this.Sources.set(source, this.Sources.get(source) || {}).get(source);
          var d = this.onAddSource(source, $type, modifier||"");
          if (!d) return 0;
          s[$type] = d;
          return 1;
        },

        /**
         * Removes a message source.
         * Calls onRemoveSource() when a descriptor was found.
         *
         * @param {object} source - the message source to remove
         * @param {string} $type - the message/event type specifier
         */
        remSource : function (source, $type) {
          var s = this.Sources.get(source);
          if (s && s[$type]) this.onRemoveSource(source, $type, s[$type]);
          // TO BE CHECKED:
          //delete s[$type];
          return 1;
        },
        
        /**
         * Modifies a message type based on a given modifier.
         * When no modifier is given (e.g. an empty string), the message
         * type is returned without modification.
         * Otherwise the message type is currently modified in two ways:
         *
         * 1. when the modifier starts with an exclamation mark (!), the
         *    message type is replaced by the modifier excluding the
         *    exclamation mark.
         * 2. the modifier is handled as a prefix for the message type.
         *
         * @param {string} $type - the message type to modifier
         * @param {string} modifier - the modifier to apply
         * @return {string} the modified message type
         */
        modifyMessageType : function($type, modifier) {
          var res = $type;
          if (modifier) {
            if (modifier[0] === '!') res = modifier.slice(1);
            else res = modifier + res;
          }
          return(res);
        }
      };
      
      /**
       * Default connector for EventTargets.
       * An EventTarget is recognized when an object complies
       * to the IEventTarget interface.
       * TO BE CHECKED: is it feasable to check if the source is
       * an instance of EvenTarget via instanceof ?
       */
      registerConnector(util.mergeObjects(Object.create(BaseConnector),
      {
        // Connectors name
        Name : "EventTargetConnector",

        /**
         * Initializes the connector.
         * Creates property "handleMessage" as bounded function to
         * owner.sendMessage() for forwarding incoming events to the message manager.
         *
         * @param {object} owner - the owning message manager
         * @return {int} always 1
         */
        onInit : function (owner) {
          this.handleMessage = (function (e) {
            return this.Owner.sendMessage(e.type, e);
          }).bind(this);
          return 1;
        },

        /**
         * Indicates whether an object could be handled as message source.
         *
         * The source is checked if it complies to IEventTarget.
         *
         * @param {object} source - the message source to be handled
         * @return {boolean} true when the source could be handled, otherwise false
         */
        canHandle : function (source) {
          return(util.checkType(IEventTarget, source));
        },

        /**
         * Installs a listener for the specified source and event.
         *
         * @param {object} source - the source object to listen to
         * @param {string} $type - the event type to listen to
         * @param {string} modifier - an optional message type modifier (see modifyMessageType())
         * @return {any} the source descriptor, which is the handling function
         */
        onAddSource : function (source, $type, modifier) { // returns descriptor
          var owner = this.Owner,
              _type = this.modifyMessageType($type, modifier),
              f = _type !== $type ?
              function (e) {
                return owner.sendMessage(_type, e);
              } : this.handleMessage;
          source.addEventListener($type, f, true);
          return(f);
        },

        /**
         * Removes an existing listener for the specified source and event.
         *
         * @param {object} source - the source object of the existing listener
         * @param {string} $type - the event type
         * @param {any} descriptor - the listeners descriptor
         */
        onRemoveSource : function (source, $type, descriptor) {
          source.removeEventListener($type, descriptor, true);
        }
      }));
      
      /***
       * Default connector for using message managers
       * as message sources.
       */            
      registerConnector(util.mergeObjects(Object.create(BaseConnector), {
        
        // the connectors name
        Name : "MessageHandlerConnector",

        /**
         * Indicates whether an object could be handled as message source.
         * The source is checked if it complies to IMessageHandler.
         *
         * @param {object} source - the message source to be handled
         * @return {boolean} true when the source could be handled, otherwise false
         */
        canHandle : function (source) {
          return(util.checkType(IMessageHandler, source));
        },

        /**
         * Initializes the connector.
         * Creates property "handleMessage" as bounded function to
         * owner.sendMessage() for forwarding incoming events to the message manager.
         *
         * @param {object} owner - the owning message manager
         * @return {int} always 1
         */
        onInit : function (owner) {
          this.handleMessage = (function () {
            return this.Owner.sendMessage.apply(this.Owner, arguments);
          }).bind(this);
          return 1;
        },

        /**
         * Installs a listener for the specified source and type.
         *
         * @param {object} source - the source object to listen to
         * @param {string} $type - the message type to listen to
         * @param {string} modifier - a message type modifier (see modifyMessageType())
         * @return {any} the source descriptor, which is the handling function
         */
        onAddSource : function (source, $type, modifier) { // returns descriptor
          var owner = this.Owner,
              _type = this.modifyMessageType($type, modifier),
              f = _type !== $type ? function () {
                return owner.sendMessage.apply(owner, [_type].concat(util.copyArray(arguments,1))) 
            }
          : this.handleMessage;
          source.on($type, f);
          return(f);
        },

        /**
         * Removes an existing listener for the specified source and event.
         *
         * @param {object} source - the source object of the existing listener
         * @param {string} $type - the event type
         * @param {any} descriptor - the listeners descriptor
         */
        onRemoveSource : function (source, $type, descriptor) {
          source.off($type, descriptor);
        }
      }));

      // prototype
      var $prototype = {

        // catchall export
        "CATCHALL" : CATCHALL,
      
        /**
         * Adds a message listener to the message manager.
         * When catchall is specified as message type, all messages are forwarded.
         *
         * @param {string} $type - message type to receive messages for
         * @param {function} fn - function to be called when a message is available
         */
        on : function ($type, fn) {
          var l = this._listeners, t = $type||CATCHALL, a = l[t] ? l[t] : (l[t] = []);
          a.push(fn);
        },

        /**
         * Removes a prior registered message listener.
         *
         * @param {string} $type - message type the listener was registered for
         * @param {function} fn - registered listeners function
         */
        off : function ($type, fn) {
          var a = this._listeners[$type||CATCHALL]||[], i = a.indexOf(fn);
          if (i >= 0) a[i] = null;
        },

        /**
         * Dispatches a message.
         * A message is dispatched to all listeners, as long as no listener is
         * returning a value evaluated as *true*. Catchall listeners are served first.
         * Messages with the type catchall are only delivered to catchall listeners
         * (no broadcasting).
         *
         * @param {string} $type - message type of the message
         * @param {...any} - message content
         * @return {any} the first returned result of a listener or undefined if none
         */
        sendMessage : function($type) {
          var r, l = null, a = (this._listeners[CATCHALL] || []).concat($type !== CATCHALL ? this._listeners[$type] || [] : []);
          for (var i = 0, len = a.length; i < len; i++)
            if (((l = a[i]) !== null) && (r = l.apply(this, arguments))) return(r);
        },
        
        /**
         * Checks if an object complies to an interface definiton,
         * export for util.checkType().
         *
         * See util.checkType() for a more detailed description.
         */
        __isValidInterface : util.checkType,

        /**
         * Export for registerConnector().
         *
         * See registerConnector for a detailed description.
         */
        registerMessageConnector : function (conn) { // class method
          return registerConnector(conn);
        },

        /**
         * Adds a message source to the message manager.
         * Will check first if an appropriate connector is already
         * instantiated. When not, it is checked if an there is
         * any connector registerd which can handle the source and
         * if so, the connector is instantiated, initialized and
         * added to the message manager.
         * 
         * When a connector is available, the connectors addSource()
         * method is called with all given arguments.
         * On success the source is stored in the property "_sources"
         * with a reference to the handling connector.
         *
         * @param {object} src - the message source to add
         * @param {...any} - additional parameters needed by the connector
         * @return {boolean} true on success, otherwise false
         */
        addMessageSource : function (src) {
          var co = this._sources.get(src);
          if (!co) {
            for (var i = 0, c = this._connectors; i < c.length && (co = c[i]); i++)
              if (co.canHandle.apply(co, arguments)) break; else co = null;
            if (!co) {
              for (i = 0; c = CONNECTORS, i < c.length && (co = c[i]); i++) {
                if (co.canHandle.apply(co, arguments)) {
                  co = Object.create(co);
                  if (co.init(this)) {
                    this._connectors.push(co);
                    break;
                  } 
                } 
                co = null;
              }
            }
            if (co) this._sources.set(src, co);
          }
          if (co) return(co.addSource.apply(co, arguments));
          /*
          for (var i = 0, c = this._connectors; i < c.length; i++)
            if (c[i].canHandle.apply(c[i], arguments)) {
              this._sources.set(src, c[i]);
              return(c[i].addSource.apply(c[i], arguments));
            }
          for (i = 0; c = CONNECTORS, i < c.length; i++)
            if (c[i].canHandle.apply(c[i],arguments)) {
              var co = Object.create(c[i]);
              if (co.init(this)) {
                this._connectors.push(co);
                return(co.addSource.apply(co, arguments));
              }
            }
          */
          return false;
        },

        /**
         * Removes a previously added message source.
         *
         * @param {object} src - the message source
         * @param {...any} - additional parameters needed by the connector
         * @return {any} return value from the connector or false
         */
        removeMessageSource : function (src) {
          var c = this._sources[src];
          if (c) return(c.remSource.apply(c, arguments));
          return false;
        },

       /**
        * Returns a new instance of a base connector.
        * This method shall be used when creating new connectors.
        * The method creates a new instance of the 
        *
        * @return {object} a fresh instance of the base connector
        */
        createBaseConnector : function () {
          return(Object.create(BaseConnector));
        },

       /**
        * Instantiates a new message manager object or enriches
        * a given object with a message manager functionality.
        *
        * Enriching is done by adding the message manager as last
        * prototype (replacing Object).
        *
        * @param {object} target - the target to enrich (optional)
        * @return {object} a pure message manager object or the 
        * enriched target object
        */
        create : function (target) {
          var r = Object.create(this);
          
          //var r = util.mergeObjects(target instanceof Object ? target || {} : {}, this, "create");
          r._listeners = {};
          r._connectors = [];
          r._sources = new Map();
          
          if (target && target instanceof Object) {
            var o = target, p = Object.getPrototypeOf(o), op = Object.getPrototypeOf({});
            while (p && p !== op) { o = p; p = Object.getPrototypeOf(o); }
            Object.setPrototypeOf(o, r);
            r = target;
          }
          /*
          console.log(r);
          for (var i = 0; i < CONNECTORS.length; i++)
            r.addMessageConnector(Object.create(CONNECTORS[i]));
          */
          return(r);                
        }
      };

      return ($prototype);
    }
    
    Unit.uses("util", util => Unit.register("MessageManager", implementation(util), {
      author: "rbund"
    }));
  })()
