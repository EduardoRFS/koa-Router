const Promise = require('any-promise');
const compose = require('koa-compose');
const flatten = require('array-flatten');
const debug = require('debug')('koa-Router:index');
const methods = require('methods');
const Layer = require('./layer');
const Route = require('./route');

/**
 * Module variables.
 * @private
 */

const objectRegExp = /^\[object (\S+)\]$/;
const { slice } = Array.prototype;
const { toString } = Object.prototype;

/**
 * @returns {proto}
 */
const Router = (module.exports = function Router(opts = {}) {
  function router(ctx, next) {
    return router._middleware(ctx, next);
  }

  // mixin Router class functions
  Object.assign(router, proto);

  router.params = [];
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];
  router.configStack = Router.configStack.slice(0);
  router._middleware = compose(router.stack);

  return router;
});
Router.configStack = [];
const proto = Router.prototype;
/* proto.param = function param (name, fn) {
  const params = this._params;
  const len = params.length;
  let ret;

  //
  if (name[0] === ':') {
    // TODO: deprecate?
    //deprecate('router.param(' + JSON.stringify(name) + ', fn): Use router.param(' + JSON.stringify(name.substr(1)) + ', fn) instead');
    name = name.substr(1);
  }

  for (let i = 0; i < len; i++) {
    ret = params[i](name, fn);
    if (ret)
      fn = ret;
  }

  // ensure we end up with a middleware function
  if (typeof fn !== 'function')
    throw new Error(`invalid param() call for ${name}, got ${fn}`);

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
}; */

Router.config = proto.config = function config(patch) {
  this.configStack.push(patch);
};

proto.routes = function routes() {
  return this;
};

proto.use = function use(fn) {
  let offset = 0;
  let path = '/';

  // default path to '/'
  // disambiguate router.use([fn])
  if (typeof fn !== 'function') {
    let arg = fn;

    // TODO: understand this
    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  const callbacks = slice.call(arguments, offset);

  if (callbacks.length === 0)
    throw new TypeError('Router.use() requires middleware');

  for (let fn of callbacks) {
    // add the middleware
    debug('use %s %s', path, fn.name || '<anonymous>');

    this.configStack.forEach(patch => {
      fn = patch(fn) || fn;
    });

    if (typeof fn !== 'function')
      throw new TypeError(
        `Router.use() requires middleware function but got a ${gettype(fn)}`
      );

    const layer = new Layer(
      path,
      {
        sensitive: this.caseSensitive,
        strict: false,
        end: false
      },
      fn
    );

    layer.route = undefined;

    this.stack.push(layer.handle.bind(layer));
  }

  return this;
};

proto.route = function route(path) {
  const route = new Route(path);

  const layer = new Layer(
    path,
    {
      sensitive: this.caseSensitive,
      strict: this.strict,
      end: true
    },
    route.handle
  );

  this.stack.push(layer.handle.bind(layer));
  return route;
};

const patchHandler = (fn, patch) => patch(fn) || fn;
// create Router#VERB functions
methods.concat('all').forEach(method => {
  function methodHandler(path, ...middlewares) {
    const route = this.route(path);
    const patchedMiddlewares = middlewares.map(middleware =>
      this.configStack.reduce(patchHandler, middleware)
    );
    route[method](...patchedMiddlewares);
    return this;
  }
  proto[method] = methodHandler;
  Object.defineProperty(methodHandler, 'name', { value: `Router<${method}>` });
});
// get type for error message
function gettype(obj) {
  const type = typeof obj;

  if (type !== 'object') {
    return type;
  }

  // inspect [[Class]] for objects
  return toString.call(obj).replace(objectRegExp, '$1');
}
