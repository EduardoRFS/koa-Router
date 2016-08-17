# koa-Router
Yet another router Koa 2, based on express router code
```javascript
'use strict';
const app = new (require('koa'))();
const router = require('koa-Router')();

router.use((ctx, next) => next()
    .then(_ => console.log('Success'))
    .catch(err => console.error(err.stack))
);
router.get('/:id', ctx => ctx.body = 'Success, this is amazing ' + ctx.params.id);
router.post('/:id', ctx => Promise.reject(new Error('Bad METHOD')));
app.use(router);

app.listen(3000);
```