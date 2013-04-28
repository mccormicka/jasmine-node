/* Setup file run before spec files to setup the context (and RequireJS
 * specifically) to execute the spec file.
 *
 * Defined by caller:
 * - Jasmine predefines
 * - require (Node require)
 * - __dirname, __filename
 * - baseUrl (Relative path to the directory containing this file)
 * - csPath (Path to require-cs module)
 *
 * See requirejs-runner source for full invocation details.
 *
 * call the following to run with this configuration file
 * ./node_modules/jasmine-node/bin/jasmine-node server/tests/ --runWithRequireJs --requireJsSetup jasmine-node.config.js --autotest
 */
var requirejsOrig = require('requirejs'),
    ostring = Object.prototype.toString,
    path = require('path'),
    isArray = function(it){
        return ostring.call(it) === '[object Array]';
    },
    isFunction = function(it){
        return ostring.call(it) === '[object Function]';
    },
    requirejs = function(deps, callback){
        var retVal;

        if(!isArray(deps) && typeof deps !== 'string'){
            if(isArray(callback)){
                retVal = requirejsOrig(deps, callback, arguments[2]);
            } else {
                retVal = requirejsOrig(deps, [], callback);
            }
        } else {
            retVal = requirejsOrig(deps, callback);
        }

        return retVal;
    };

var appconfig = require(path.resolve(configFile));

if(coverage.cover && !appconfig.config.__covered__){
    var base = appconfig.config.baseUrl;
    var covBase = base.split(path.sep);
    appconfig.config.baseUrl = covBase[0] + '-cov' + path.sep;
    appconfig.config.__covered__ = true;
    console.log('Rewriting requirejs baseUrl', base, ' to point to coverage url', appconfig.config.baseUrl);
}

var requireorig = require;
appconfig.config.nodeRequire = function(value){
    console.log('requiring ', value);
    return requireorig(value);
},
requirejsOrig.config(appconfig.config);

for(var key in requirejsOrig) {
    requirejs[key] = requirejsOrig[key];
}

requirejs.config = function(newConfig){
    var alteredConfig = _.clone(appconfig.config);

    for(var key in newConfig) {
        alteredConfig[key] = newConfig[key];
    }
    console.log('Altered config ', alteredConfig);

//    if(alteredConfig.baseUrl){
//        var base = baseUrl.replace(/\\/g, '/'),
//            splitUrl = alteredConfig.baseUrl.replace(/\\/g, '/').split('/'),
//            index = 0;
//
//        for(; index < splitUrl.length; index++){
//            if(splitUrl[index] === '..'){
//                base = path.dirname(base);
//            } else {
//                base += '/' + splitUrl[index];
//            }
//        }
//
//        console.log('SETTING BASE ', base);
//        alteredConfig.baseUrl = base;
//    }

    return requirejsOrig.config(alteredConfig);
};

require = requirejs;
define = requirejs.define;