(function () {
  "use strict";
  
  // -------------
  // PureEmitter
  // -------------
  // serializes incoming messages and dispatches them to a handler.
  
  // object version:
  function PureEmitter(handler) {
    var Queue = [],
        Dispatch_msg = null;

    function dispatch() {
      if (Dispatch_msg) return;
      while (Queue.length)
        if (handler(Dispatch_msg = Queue.shift()) === false) break;
      Dispatch_msg = null;
    }
    return {
      emit: function (msg) {
        Queue.push(msg);
        dispatch();
        return this;
      }
    }
  }
  
  // function version:
  function PureEmitterF(handler) {
    var Queue = [],
        Dispatch_msg = null;

    function dispatch() {
      if (Dispatch_msg) return;
      while (Queue.length)
        if (handler(Dispatch_msg = Queue.shift()) === false) break;
      Dispatch_msg = null;
    }
    return function (msg) { // emit
      Queue.push(msg);
      dispatch();
      return this;
    }
  }

  // ---------------------------
  // Helper: combineHandler()
  // creates an handler function based on a given object.
  // important: obj is dynamic and can change on runtime!
  function combineHandler(obj, catchall) {
    var ca = (catchall == null) ? null : (""+catchall);
    return function (m) {
      if (obj[m.type] instanceof Function) return obj[m.type](m);
      if (ca != null && obj[ca] instanceof Function) return obj[ca](m);
    }
  }
  
  // -------------------------
  // Helper: multiHandler()
  // creates an handler function based on given object.
  // supports object cascading.
  function multiHandler(obj) {
    var handle = function (o, m) {
      var all = Object.values(o);
      while (all.length) {
        let h = all.shift(),
            t = typeof(h);
        if ((t === "function" ? h(m) : (h && t === "object") ? handle(h, m) : true) === false) return false;
      }
    }
    return function (m) {
      if (obj[m.type] instanceof Function) return obj[m.type](m);
      if (obj[m.type] && typeof(obj[m.type]) === "object") return handle(obj[m.type], m);
    }
  }
  
  // ----------------
  // SimpleEmitter
  // ----------------
  function SimpleEmitter() { // with wildcard!
    var D = Object.create(null),
        wildcardid = "*",
        wildcard = D[wildcardid] = Object.create(null);
    wildcard._ctr = 0;
    return Object.assign(PureEmitter(multiHandler(D)), {
      on: function (atype, handler) {
        atype = (atype == null) ? wildcardid : atype;
        var ho = D[atype] || (D[atype] = Object.assign(Object.create(null), {_ctr: 1, "0": wildcard })),
            id = ""+(ho._ctr++);
        ho[id] = handler;
        return function () {
          delete ho[id];
        }
      }
    });
  }
  
  // --------------
  // EventRouter
  // --------------
  function EventRouter(e) {
    var Caught = Object.create(null);
    return Object.assign(e, {
      catch: function (id, target, atype, addition) {
        if (Caught[id]) return false;
        Caught[id] = target.removeEventListener.bind(target, atype, e.emit, addition);
        target.addEventListener(atype, e.emit, addition);
        return true;
      },
      release: function (id) {
        for (let i = 0; i < arguments.length; i++) {
          let id = arguments[i];
          if (Caught[id]) {
            Caught[id]();
            delete Caught[id];
          }
        }
      }
    })
  }
  

  // ---------
  // DynBus
  // ---------
  function DynBus() {
    var ctr = 0,
        List = Object.create(null);

    // Compares two objects and returns `true` on comparison success,
    // otherwise `false`.
    // Checks if all enumerable properties (key/value) of `master` are
    // present in `tocheck`. Comparison is done by `===` operator, except
    // for `RegExp` values.
    function objcmp(tocheck, master) {
      if (tocheck === master) return true;
      for (let a = Object(tocheck), b = Object(master), mkeys = Object.keys(b), i = 0; i < mkeys.length; i++) {
        let k = mkeys[i], v = b[k];
        if (v instanceof RegExp && v.test(a[k])) continue;
        if (a[k] === v) continue;
        return false;
      }
      return true;
    }
    // Filters all subscribers based on given selector and returns
    // an array of subscribers which passed.
    function filter(sel) {
      var res = [];
      for (let i = 0, all = Object.values(List); i < all.length; i++)
        if (objcmp(sel, all[i].sel)) res.push(all[i]);
      return res;
    }
    //
    return {
      sub: function (selector, handler) {
        var id = "" + (ctr++);
        List[id] = {
          sel: Object(selector),
          fn : handler
        }
        return function () {
          delete List[id];
        }
      },
      pub: PureEmitterF( function (m) {
        var recv = filter(m);
        while (recv.length) (recv.shift().fn(m))
      })
    }
  }

  // ---------
  // WinBus
  // ---------
  function WinBus() {
    var TMap = Object.create(null),
        registerTarget = function (target, tid) {
          if (target == null) {
            console.warn("tried to register a 'null' target");
            return "";
          }
          tid = tid == null ? "target" : (""+tid);
          for (let c = 1, ttid = tid; TMap[tid] && c < Number.MAX_VALUE; tid = ttid + (c++)) ;
          if (TMap[tid]) return "";
          TMap[tid] = target;
          res.sub({ target: tid }, function (m) { _post(tid, m) });
          return tid;
        },
        _post = function (tid, m, origin) {
          var tWin = TMap[tid] || null;
          // new, set the target within the message when not given...
          m.target = m.target || tid;
          if (tWin) tWin.postMessage(m, origin||"*");
          return tWin != null;
        },
        res = Object.assign({
          onmessage : function (m) {
            var src = m.source || m.target,
                i = Object.values(TMap).indexOf(src),
                k = (i >= 0) ? Object.keys(TMap)[i] : registerTarget(src);
            //if (i < 0) res.sub({ target: k }, function (m) { _post(k, m) });
            res.pub(Object.assign({
              origin: m.origin,
              source: k
            }, m.data))
          },
          registerTarget: registerTarget,
          post: _post,
          getMap: function () { return Object.assign({}, TMap); },
        }, DynBus());
    TMap.Main = self || window;
    return res;
  }


  // ---------
  // WinBusClient
  // ---------
  function WinBusClient(handler, master) {
    var win = self || window,
        pe = PureEmitterF(handler),
        robj = {
          onmessage: function (m) {
            pe(m.data)
          },
          post : function (m, origin) {
            master.postMessage(m, origin||"*")
          }
        };
    master = master || win.opener || win.top || win,
    win.onmessage = robj.onmessage;
    return robj;
  }

  var exp = {
    PureEmitter,
    PureEmitterF,
    combineHandler,
    multiHandler,
    SimpleEmitter,
    EventRouter,
    DynBus,
    WinBus,
    WinBusClient
  }
  
  if (Units) Units.register("emitters", exp, { author: "rbund" });
  else window.emitters = exp;

})();
