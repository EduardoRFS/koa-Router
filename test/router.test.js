'use strict';
/** from https://github.com/inca/koa-router2 */
const request = require('supertest');
const Router = require('../lib');
const Koa = require('koa');

describe('Router', function() {

  context('methods', function() {

    const app = new Koa();
    const router = new Router();

    router.get('/', ctx => ctx.body = 'Hi, get');
    router.post('/', ctx => ctx.body = 'Hi, post');
    router.all('/', ctx => ctx.body = 'Hi, everyone');

    app.use(router);

    it('answers GET requests', done => {
      request(app.listen())
        .get('/')
        .expect('Hi, get', done);
    });

    it('answers POST requests', done => {
      request(app.listen())
        .post('/')
        .expect('Hi, post', done);
    });

    it('answers other requests', done => {
      request(app.listen())
        .put('/')
        .expect('Hi, everyone', done);
    });

  });

  context('paths', function() {
    const app = new Koa();
    const router = new Router();
    router.get('/', ctx => ctx.body = 'Welcome');
    router.get('/hello', ctx => ctx.body = 'Hello');

    app.use(router);
    it('matches /', done => {
      request(app.listen())
        .get('/')
        .expect('Welcome', done);
    });

    it('matches paths', done => {
      request(app.listen())
        .get('/hello')
        .expect('Hello', done);
    });

    it('returns 404 on unknown routes', done => {
      request(app.listen())
        .get('/smth')
        .expect(404, done);
    });

  });

  context('params', function() {
    const app = new Koa();
    const router = new Router();
    router.get('/hi/:name', ctx => ctx.body = 'Hi, ' + ctx.params.name);
    router.get('/file/*', ctx => ctx.body = ctx.params[0]);

    app.use(router);
    it('captures named parameters', done => {
      request(app.listen())
        .get('/hi/jack')
        .expect('Hi, jack', done);
    });

    it('matches splats', done => {
      request(app.listen())
        .get('/file/foo/bar/baz')
        .expect('foo/bar/baz', done);
    });

  });

  context('middleware', function() {
    const app = new Koa();
    const router = new Router();
    router.use((ctx, next) => {
      ctx.body = '1';
      return next();
    });
    router.use((ctx, next) => {
      ctx.body += '2';
      return next();
    });
    router.use((ctx, next) => {
      ctx.body += '3';
      return next();
    });
    router.get('/', ctx => {
      ctx.body += '4';
    });

    app.use(router);
    it('execute .use middleware in order', done => {
      request(app.listen())
        .get('/')
        .expect('1234', done);
    });

  });
  context('exceptions', function() {
    const app = new Koa();
    const router = new Router();
    const router2 = new Router();

    router2.post('/', ctx => {
      throw new Error('Multi Magic Error');
    });

    router.use((ctx, next) => {
      return next()
        .catch(err => ctx.body = err.message);
    });
    router.use(router2);
    router.get('/', ctx => {
      throw new Error('Magic Error');
    });

    app.use(router);
    it('catch', done => {
      request(app.listen())
        .get('/')
        .expect('Magic Error', done);
    });
    it('multi layer catch', done => {
      request(app.listen())
        .post('/')
        .expect('Multi Magic Error', done);
    });
  });

  context('custom handler', function() {
    const app = new Koa();
    const router = new Router();

    router.config(value => {
      if (typeof value === 'string')
        return function (ctx, next) {
          ctx.body = value;
        };
    });

    router.get('/', 'Magic');

    app.use(router);

    it('works', done => {
      request(app.listen())
        .get('/')
        .expect('Magic', done);
    })
  });
});
