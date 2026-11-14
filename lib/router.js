const express = require('express');
// Express 4 needs explicit forwarding of rejected promises.
module.exports = function createRouter() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const register = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      register(
        path,
        ...handlers.map(
          (handler) => (req, res, next) =>
            Promise.resolve()
              .then(() => handler(req, res, next))
              .catch(next)
        )
      );
  }
  return router;
};
