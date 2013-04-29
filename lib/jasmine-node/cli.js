var util,
    Path= require('path'),
    fs  = require('fs');


var jasmine = require('./index');

try {
  util = require('util')
} catch(e) {
  util = require('sys')
}

var helperCollection = require('./spec-collection');

var specFolders = [];

// The following line keeps the jasmine setTimeout in the proper scope
jasmine.setTimeout = jasmine.getGlobal().setTimeout;
jasmine.setInterval = jasmine.getGlobal().setInterval;
for (var key in jasmine)
  global[key] = jasmine[key];

var isVerbose = false;
var showColors = true;
var teamcity = process.env.TEAMCITY_PROJECT_NAME || false;
var useRequireJs = false;
var extentions = "js";
var match = '.';
var matchall = false;
var autotest = false;
var useHelpers = true;
var forceExit = false;
var captureExceptions = false;
var includeStackTrace = true;

var coverage = {
    cover:false,
    savePath: './reports/',
    basePath: false,
    excludes:false,
    coverageForceExit: false
};

var junitreport = {
  report: false,
  savePath : "./reports/",
  useDotNotation: true,
  consolidate: true
}

var args = process.argv.slice(2);
var existsSync = fs.existsSync || Path.existsSync;

while(args.length) {
  var arg = args.shift();

  switch(arg)
  {
    case '--color':
      showColors = true;
      break;
    case '--noColor':
    case '--nocolor':
      showColors = false;
      break;
    case '--verbose':
      isVerbose = true;
      break;
    case '--coffee':
      require('coffee-script');
      extentions = "js|coffee|litcoffee";
      break;
    case '-m':
    case '--match':
      match = args.shift();
      break;
    case '--matchall':
      matchall = true;
      break;
    case '--junitreport':
        junitreport.report = true;
        break;
    case '--output':
        junitreport.savePath = args.shift();
        break;
    case '--teamcity':
        teamcity = true;
        break;
    case '--requireJsSetup':
        var setup = args.shift();

        if(!existsSync(setup))
          throw new Error("RequireJS setup '" + setup + "' doesn't exist!");

        useRequireJs = setup;
        break;
    case '--runWithRequireJs':
        useRequireJs = useRequireJs || true;
        break;
    case '--nohelpers':
        useHelpers = false;
        break;
    case '--test-dir':
        var dir = args.shift();

        if(!existsSync(dir))
          throw new Error("Test root path '" + dir + "' doesn't exist!");

        specFolders.push(dir); // NOTE: Does not look from current working directory.
        break;
    case '--autotest':
        autotest = true;
        break;
    case '--forceexit':
        forceExit = coverage.cover ? false : true;
        coverage.coverageForceExit = true;
        break;
    case '--captureExceptions':
        captureExceptions = true;
        break;
    case '--noStack':
        includeStackTrace = false;
        break;
    case '--config':
        var configKey = args.shift();
        var configValue = args.shift();
        process.env[configKey]=configValue;
        break;
    case '--coverage':
        coverage.basePath = args.shift();
        if(!existsSync(coverage.basePath))
            throw new Error('source coverage directory "' + coverage.basePath + '" doesn\'t exist!');
        coverage.cover = true;
        if(forceExit){
            coverage.coverageForceExit = true;
            forceExit = false;
        }
      break;
    case '--coverage-excludes':
        coverage.excludes = args.shift();
      break;
  case '--coverage-save-path':
      coverage.savePath = args.shift();
      break;
    case '-h':
        help();
      break;
    default:
      if (arg.match(/^--params=.*/)) {
        break;
      }
      if (arg.match(/^--/)) help();
      if (arg.match(/^\/.*/)) {
        specFolders.push(arg);
      } else {
        specFolders.push(Path.join(process.cwd(), arg));
      }
      break;
  }
}

if (specFolders.length === 0) {
  help();
} else {
  // Check to see if all our files exist
  for (var idx = 0; idx < specFolders.length; idx++) {
    if (!fs.existsSync(specFolders[idx])) {
        console.log("File: " + specFolders[idx] + " is missing.");
        return;
    }
  }
}

if (autotest) {
  //TODO: this is ugly, maybe refactor?

  var glob = specFolders.map(function(path){
    return Path.join(path, '**/*.js');
  });

  if (extentions.indexOf("coffee") !== -1) {
    glob = glob.concat(specFolders.map(function(path){
      return Path.join(path, '**/*.coffee')
    }));
  }

  require('./autotest').start(specFolders, glob);

  return;
}

var exitCode = 0;

if (captureExceptions) {
  process.on('uncaughtException', function(e) {
    console.error(e.stack || e);
    exitCode = 1;
    process.exit(exitCode);
  });
}

process.on("exit", onExit);

function onExit() {
  process.removeListener("exit", onExit);
  process.exit(exitCode);
}

var onComplete = function(runner, log) {
  util.print('\n');
  if (runner.results().failedCount == 0) {
    exitCode = 0;
  } else {
    exitCode = 1;
  }
  if (forceExit) {
    process.exit(exitCode);
  }
};

if(useHelpers){
  specFolders.forEach(function(path){
    jasmine.loadHelpersInFolder(path,
                                new RegExp("helpers?\\.(" + extentions + ")$", 'i'));

  })
}

var regExpSpec = new RegExp(match + (matchall ? "" : "spec\\.") + "(" + extentions + ")$", 'i')


var options = {
  specFolders:  specFolders,
  onComplete:   onComplete,
  isVerbose:    isVerbose,
  showColors:   showColors,
  teamcity:     teamcity,
  useRequireJs: useRequireJs,
  regExpSpec:   regExpSpec,
  junitreport:  junitreport,
  includeStackTrace: includeStackTrace,
  coverage: coverage
}

//Support for jscoverage
jasmine.setupCoverage(coverage);

jasmine.executeSpecsInFolder(options);


function help(){
  util.print([
    'USAGE: jasmine-node [--color|--noColor] [--verbose] [--coffee] directory'
  , ''
  , 'Options:'
  , '  --autotest         - rerun automatically the specs when a file changes'
  , '  --color            - use color coding for output'
  , '  --noColor          - do not use color coding for output'
  , '  -m, --match REGEXP - load only specs containing "REGEXPspec"'
  , '  --matchall         - relax requirement of "spec" in spec file names'
  , '  --verbose          - print extra information per each test run'
  , '  --coffee           - load coffee-script which allows execution .coffee files'
  , '  --junitreport      - export tests results as junitreport xml format'
  , '  --output           - defines the output folder for junitreport files'
  , '  --teamcity         - converts all console output to teamcity custom test runner commands. (Normally auto detected.)'
  , '  --runWithRequireJs - loads all specs using requirejs instead of node\'s native require method'
  , '  --requireJsSetup   - file run before specs to include and configure RequireJS'
  , '  --test-dir         - the absolute root directory path where tests are located'
  , '  --nohelpers        - does not load helpers.'
  , '  --forceexit        - force exit once tests complete.'
  , '  --captureExceptions- listen to global exceptions, report them and exit (interferes with Domains)'
  , '  --config NAME VALUE- set a global variable in process.env'
  , '  --noStack          - suppress the stack trace generated from a test failure'
  , '  --coverage         - creates code coverage reports for the supplied folder (should cover both your actual code base and your tests)'
  , '  --coverage-excludes - A glob expression to use for excluding files from the test coverage. for example server/**/*.html'
  , '  --coverage-save-path - An optional save path to save the reports to. defaults to ./reports/'
  , '  -h, --help         - display this help and exit'
  , ''
  ].join("\n"));

  process.exit(-1);
}
