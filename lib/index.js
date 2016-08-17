'use strict';
const compose = require('koa-compose');
const flatten = require('array-flatten');
const debug = require('debug')('koa-Router:index');
const Layer = require('./layer');
const Route = require('./route');
const methods = require('methods');

/**
 * Module variables.
 * @private
 */

const objectRegExp = /^\[object (\S+)\]$/;
const slice = Array.prototype.slice;
const toString = Object.prototype.toString;

const proto = module.exports = function (opts = {}) {
  function router (ctx, next) {
    return router.middleware(ctx, next);
  }

  // mixin Router class functions
  Reflect.setPrototypeOf(router, proto);

  router.params = [];
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];
  router.middleware = compose(router.stack);

  return router;
};

/*proto.param = function param (name, fn) {
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
};*/

proto.use = function use (fn) {
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

  const callbacks = flatten(slice.call(arguments, offset));

  if (callbacks.length === 0)
    throw new TypeError('Router.use() requires middleware functions');

  for (let fn of callbacks) {
    if (typeof fn !== 'function')
      throw new TypeError('Router.use() requires middleware function but got a ' + gettype(fn));

    // add the middleware
    debug('use %s %s', path, fn.name || '<anonymous>');

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);

    layer.route = undefined;

    this.stack.push(layer.handle.bind(layer));
  }

  return this;
};

proto.route = function route (path) {
  const route = new Route(path);

  const layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.handle);

  this.stack.push(layer.handle.bind(layer));
  return route;
};

// create Router#VERB functions
methods.concat('all').forEach(method => proto[method] = function (path) {
  const route = this.route(path);
  route[method].apply(route, slice.call(arguments, 1));
  return this;
});
// get type for error message
function gettype(obj) {
  var type = typeof obj;

  if (type !== 'object') {
    return type;
  }

  // inspect [[Class]] for objects
  return toString.call(obj)
    .replace(objectRegExp, '$1');
}