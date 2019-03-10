/** from https://github.com/inca/koa-router2 */
const request = require('supertest');
const Koa = require('koa');
const Router = require('../lib');

describe('methods', () => {
  const app = new Koa();
  const router = new Router();

  router.get('/', ctx => {
    ctx.body = 'Hi, get';
  });
  router.post('/', ctx => {
    ctx.body = 'Hi, post';
  });
  router.all('/', ctx => {
    ctx.body = 'Hi, everyone';
  });

  app.use(router);
  test('answers GET requests', async () => {
    await request(app.listen())
      .get('/')
      .expect('Hi, get');
  });
  test('answers POST requests', async () => {
    await request(app.listen())
      .post('/')
      .expect('Hi, post');
  });
  test('answers other requests', async () => {
    await request(app.listen())
      .put('/')
      .expect('Hi, everyone');
  });
});
describe('paths', () => {
  const app = new Koa();
  const router = new Router();
  router.get('/', ctx => {
    ctx.body = 'Welcome';
  });
  router.get('/hello', ctx => {
    ctx.body = 'Hello';
  });

  app.use(router);
  test('matches /', async () => {
    await request(app.listen())
      .get('/')
      .expect('Welcome');
  });

  test('matches paths', async () => {
    await request(app.listen())
      .get('/hello')
      .expect('Hello');
  });

  test('returns 404 on unknown routes', async () => {
    await request(app.listen())
      .get('/smth')
      .expect(404);
  });
});

describe('params', () => {
  const app = new Koa();
  const router = new Router();
  router.get('/hi/:name', ctx => {
    ctx.body = `Hi, ${ctx.params.name}`;
  });
  router.get('/file/*', ctx => {
    const file = ctx.params[0];
    ctx.body = file;
  });

  app.use(router);
  test('captures named parameters', async () => {
    await request(app.listen())
      .get('/hi/jack')
      .expect('Hi, jack');
  });

  test('matches splats', async () => {
    await request(app.listen())
      .get('/file/foo/bar/baz')
      .expect('foo/bar/baz');
  });
});

describe('middleware', () => {
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
  test('execute .use middleware in order', async () => {
    await request(app.listen())
      .get('/')
      .expect('1234');
  });
});
describe('exceptions', () => {
  const app = new Koa();
  const router = new Router();
  const router2 = new Router();

  router2.post('/', () => {
    throw new Error('Multi Magic Error');
  });

  router.use((ctx, next) => {
    return next().catch(err => {
      ctx.body = err.message;
    });
  });
  router.use(router2);
  router.get('/', () => {
    throw new Error('Magic Error');
  });

  app.use(router);
  test('catch', async () => {
    await request(app.listen())
      .get('/')
      .expect('Magic Error');
  });
  test('multi layer catch', async () => {
    await request(app.listen())
      .post('/')
      .expect('Multi Magic Error');
  });
});

describe('custom handler', () => {
  const app = new Koa();
  const router = new Router();

  router.config(value => {
    if (typeof value === 'string')
      return ctx => {
        ctx.body = value;
      };
    return null;
  });

  router.get('/', 'Magic');

  app.use(router);

  test('works', async () => {
    await request(app.listen())
      .get('/')
      .expect('Magic');
  });
});
