var nodeRequire = require,
    require = require('requirejs'),
    define = require.define,
    setupHasRun = true;

require.config({
  baseUrl: baseUrl,
  nodeRequire: nodeRequire
});
delete baseUrl;
