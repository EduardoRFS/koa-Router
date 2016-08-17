'use strict';

const pathRegexp = require('path-to-regexp');
const debug = require('debug')('koa-Router:layer');

/**
 * Module variables.
 * @private
 */

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Module exports.
 * @public
 */

module.exports = Layer;

function Layer (path, opts = {}, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, opts, fn);
  }

  debug('new %s', path);

  this.fn = fn;
  this.name = fn.name || '<anonymous>';
  this.params = undefined;
  this.path = undefined;
  this.regexp = pathRegexp(path, this.keys = [], opts);

  if (path === '/' && opts.end === false) {
    this.regexp.fast_slash = true;
  }
}

Layer.prototype.handle = function handle (ctx, next) {
  const fn = this.fn;
  const done = restore(next, ctx, 'params', 'path', 'url');
  const rejected = err => {
    done();
    throw err;
  };
  if (fn.length > 2)
    return next();

  if (!this.match(ctx.path, ctx.method))
    return next();

  ctx.path = this.path;
  ctx.params = this.params;

  try {
    return Promise.resolve(this.fn(ctx, done))
      .catch(rejected);
  } catch (err) {
    return Promise.reject(err);
  }
};

Layer.prototype.match = function match (path, method) {
  if (path == null)
    return this.not_match();

  if (this.regexp.fast_slash)
    return this.always_match();

  const m = this.regexp.exec(path);

  if (this.route && this.method !== 'all') {
    method = method.toLowerCase();
    if (method === 'head' && !this.route.methods['head']) {
      method = 'get';
    }

    if (this.method && this.method !== method) {
      return this.not_match();
    }
  }

  if (!m)
    return this.not_match();

  // store values
  this.params = {};
  this.path = m[0];

  const keys = this.keys;
  const params = this.params;


  for (let i = 1; i < m.length; i++) {
    let key = keys[i - 1];
    let prop = key.name;
    let val = decode_param(m[i]);

    if (val !== undefined || !(hasOwnProperty.call(params, prop)))
      params[prop] = val;
  }

  return true;
};

Layer.prototype.not_match = function not_match () {
  this.params = undefined;
  this.path = undefined;
  return false;
};
Layer.prototype.always_match = function always_match () {
  this.params = {};
  this.path = '';
  return true;
};

function restore(fn, obj) {
  var props = new Array(arguments.length - 2);
  var vals = new Array(arguments.length - 2);
  var isCalled = false;
  for (var i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function(){
    if (isCalled) return;
    isCalled = true;
    // restore vals
    for (var i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i];
    }

    return fn();
  };
}

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}