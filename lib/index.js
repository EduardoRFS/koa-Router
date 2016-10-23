'use strict';

const pathToRegexp = require('path-to-regexp');
const methods = require('methods');
const mount = require('koa-mount');
const compose = require('koa-compose');

const proto = Router.prototype = {
  _createRoute(method) {
    return function(path, ...handlers) {

      this.stack.push((ctx, next) => {
        if (!matchMethod(ctx, method)) {
          return next();
        }
        handlers = this._applyConfig(handlers);

        const handler = compose(handlers);
        return createPathHandler(path, handler)(ctx, next);
      });
    };
  },

  _applyConfig (handlers) {
    return handlers.map(fn => {
      this.configStack.forEach(patch => {
        fn = patch(fn) || fn;
      });
      return fn;
    })
  },

  /**
   * Prefix handler, similar to Express's use
   */
  use(prefix, ...handlers) {
    if (typeof prefix == 'string') {
      handlers = this._applyConfig(handlers);
      this.stack.push(createPathHandler(prefix, compose(handlers), { end: false }));
    } else {
      this.stack.push(compose([prefix].concat(handlers)));
    }
  },

  routes() {
    return this._middleware;
  },

  mount(prefix, router) {
    if (typeof prefix == 'string') {
      this.stack.push(mount(prefix, convertRouter(router)));
    } else {
      this.stack.push(mount(convertRouter(prefix)));
    }

  },

  config (patch) {
    this.configStack.push(patch);
  }
};
proto.del = proto.delete;
Router.config = proto.config;

function Router () {
  function router (ctx, next) {
    return router._middleware(ctx, next);
  }

  router.__proto__ = proto;

  methods.forEach(method => {
    router[method] = router._createRoute(method);
  });
  router.configStack = Router.configStack.slice();
  router.stack = [];
  router._middleware = compose(router.stack);
  router.all = router._createRoute();

  return router;
}
Router.configStack = [];

module.exports = Router;

function convertRouter(handler) {
  if (!handler) {
    throw new Error('Handler should be defined.');
  }
  if (typeof handler.routes === 'function') {
    return handler.routes();
  }
  if (typeof handler == 'function') {
    return handler;
  }
  throw new Error(`Unsupported handler type: ${typeof handler == 'function'}`);
}

function createPathHandler(path, handler, options) {
  options = options || {};
  const keys = [];
  const re = pathToRegexp(path, keys, options);
  return function(ctx, next) {
    const m = re.exec(ctx.path);
    if (m) {
      const args = m.slice(1).map(decode);
      ctx.params = {};
      args.forEach((arg, i) => {
        ctx.params[i] = arg;
      });
      // This is probably incorrect: test with "zero-or-more" feature
      keys.forEach((key, i) => {
        ctx.params[key.name] = args[i];
      });
      return handler(ctx, next);
    }
    return next();
  }
}

function decode(val) {
  return val ? decodeURIComponent(val) : null;
}

function matchMethod(ctx, method) {
  if (!method) {
    return true;
  }
  method = method.toUpperCase();
  return ctx.method === method ||
    method === 'GET' && ctx.method === 'HEAD' ||
    false;
}