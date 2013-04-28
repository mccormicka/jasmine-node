var fs = require('fs');
var mkdirp = require('mkdirp');
var util;
try {
  util = require('util')
} catch(e) {
  util = require('sys')
}

var path = require('path');

var filename = __dirname + '/jasmine-1.3.1.js';
var isWindowUndefined = typeof global.window === 'undefined';
if (isWindowUndefined) {
  global.window = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
  };
}

var src = fs.readFileSync(filename);
// Put jasmine in the global context, this is somewhat like running in a
// browser where every file will have access to `jasmine`
var jasmine = require('vm').runInThisContext(src + "\njasmine;", filename);


if (isWindowUndefined) {
  delete global.window;
}
require("./async-callback");
require("jasmine-reporters");
var nodeReporters = require('./reporter').jasmineNode;
jasmine.TerminalVerboseReporter = nodeReporters.TerminalVerboseReporter;
jasmine.TerminalReporter = nodeReporters.TerminalReporter;


jasmine.loadHelpersInFolder=function(folder, matcher)
{
  // Check to see if the folder is actually a file, if so, back up to the
  // parent directory and find some helpers
  folderStats = fs.statSync(folder);
  if (folderStats.isFile()) {
    folder = path.dirname(folder);
  }
  var helpers = [],
      helperCollection = require('./spec-collection');

  helperCollection.load([folder], matcher);
  helpers = helperCollection.getSpecs();

  for (var i = 0, len = helpers.length; i < len; ++i)
  {
    var file = helpers[i].path();
    var helper= require(file.replace(/\.*$/, ""));
    for (var key in helper)
      global[key]= helper[key];
  }
};

function removeJasmineFrames(text) {
  var lines = [];
  text.split(/\n/).forEach(function(line){
    if (line.indexOf(filename) == -1) {
      lines.push(line);
    }
  });
  return lines.join('\n');
}


jasmine.setupCoverage = function(options){

    if(options.cover){
        console.log('SETTING UP COVERAGE');
        var source = options.basePath;

        if(!source){
            throw new Error('source coverage directory must be defined');
        }
        var path = require('path');
        var existsSync = fs.existsSync || path.existsSync;
        if(!existsSync(source )){
            throw new Error('source coverage directory "' + source  + '" doesn\'t exist!');
        }
        var coveragePath = options.savePath || './reports/';
        if(!existsSync(coveragePath)) {
            util.puts('creating coverage xml report save path: ' + coveragePath);
            mkdirp.sync(coveragePath, '0755');
        }

        var coverage = require('jscoverage');
        var EmmaReporter = require('./EmmaReporter');
        var rmdir = require('rimraf');

        var dest = source + '-cov';
        var excludes = [];
        if(options.excludes){
            var glob = require('glob');
            var tempExcludes = glob.sync(options.excludes);
            for (var i = 0; i < tempExcludes.length; i ++){
                excludes.push(path.basename(tempExcludes[i]));
            }
        }
        coverage.processFile(source, dest, excludes);
        var jasmineEnv = jasmine.getEnv();
        if(!jasmineEnv.globals){
            jasmineEnv.globals = {};
            jasmineEnv.globals._$jscoverage = {};
            jasmineEnv.globals._$jscoverage_cond = {};
            jasmineEnv.globals._$jscoverage_done = function (file, line, express) {
                if (arguments.length === 2) {
                    jasmineEnv.globals._$jscoverage[file][line]++;
                } else {
                    jasmineEnv.globals._$jscoverage_cond[file][line]++;
                    return express;
                }
            };

            jasmineEnv.globals._$jscoverage_init = function (base, file, lines) {
                var tmp = [];
                for (var i = 0; i < lines.length; i++) {
                    tmp[lines[i]] = 0;
                }
                base[file] = tmp;
            };

        }
        jasmineEnv.addReporter(new EmmaReporter('.', options.savePath, function(coverage){
            rmdir.sync(dest, function(err){
                console.log(err);
            });
        }));
        coverage.enableCoverage(true);
    }
};

jasmine.executeSpecsInFolder = function(options){
  var folders =      options['specFolders'];
  var done   =       options['onComplete'];
  var isVerbose =    options['isVerbose'];
  var showColors =   options['showColors'];
  var teamcity =     options['teamcity'];
  var useRequireJs = options['useRequireJs'];
  var matcher =      options['regExpSpec'];
  var junitreport = options['junitreport'];
  var includeStackTrace = options['includeStackTrace'];

  // Overwriting it allows us to handle custom async specs
  it = function(desc, func, timeout) {
      return jasmine.getEnv().it(desc, func, timeout);
  }
  var fileMatcher = matcher || new RegExp(".(js)$", "i"),
      colors = showColors || false,
      specs = require('./spec-collection'),
      jasmineEnv = jasmine.getEnv();

  specs.load(folders, fileMatcher);

  if(junitreport && junitreport.report) {
    var existsSync = fs.existsSync || path.existsSync;
    if(!existsSync(junitreport.savePath)) {
      util.puts('creating junit xml report save path: ' + junitreport.savePath);
      mkdirp.sync(junitreport.savePath, "0755");
    }
    jasmineEnv.addReporter(new jasmine.JUnitXmlReporter(junitreport.savePath,
                                                        junitreport.consolidate,
                                                        junitreport.useDotNotation));
  }

  if(teamcity){
    jasmineEnv.addReporter(new jasmine.TeamcityReporter());
  } else if(isVerbose) {
    jasmineEnv.addReporter(new jasmine.TerminalVerboseReporter({ print:       util.print,
                                                         color:       showColors,
                                                         onComplete:  done,
                                                         stackFilter: removeJasmineFrames}));
  } else {
    jasmineEnv.addReporter(new jasmine.TerminalReporter({print:       util.print,
                                                color: showColors,
                                                includeStackTrace: includeStackTrace,
                                                onComplete:  done,
                                                stackFilter: removeJasmineFrames}));
  }

  if (useRequireJs) {
    require('./requirejs-runner').executeJsRunner(
      specs,
      done,
      jasmineEnv,
      typeof useRequireJs === 'string' ? useRequireJs : null,
      options.coverage
    );
  } else {
    var specsList = specs.getSpecs();

    for (var i = 0, len = specsList.length; i < len; ++i) {
      var filename = specsList[i];
      delete require.cache[filename.path()];
      // Catch exceptions in loading the spec
      try {
        require(filename.path().replace(/\.\w+$/, ""));
      } catch (e) {
        console.log("Exception loading: " + filename.path());
        console.log(e);
      }
    }

    jasmineEnv.execute();
  }
};

function now(){
  return new Date().getTime();
}

jasmine.asyncSpecWait = function(){
  var wait = jasmine.asyncSpecWait;
  wait.start = now();
  wait.done = false;
  (function innerWait(){
    waits(10);
    runs(function() {
      if (wait.start + wait.timeout < now()) {
        expect('timeout waiting for spec').toBeNull();
      } else if (wait.done) {
        wait.done = false;
      } else {
        innerWait();
      }
    });
  })();
};
jasmine.asyncSpecWait.timeout = 4 * 1000;
jasmine.asyncSpecDone = function(){
  jasmine.asyncSpecWait.done = true;
};

for ( var key in jasmine) {
  exports[key] = jasmine[key];
}
