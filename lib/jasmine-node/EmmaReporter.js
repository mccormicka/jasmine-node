/*global _$jscoverage: true */

var path = require('path')
  , fs = require('fs')
  , jasmine = require('jasmine-node');

function pad(s) {
  return '0000'.substr(s.length) + s;
}

function quote(s) {
  return '"' + s.replace(/[\u0000-\u001f"\\\u007f-\uffff]/g, function (c) {
    switch (c) {
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '"':
        return '\\"';
      case '\\':
        return '\\\\';
      default:
        return '\\u' + pad(c.charCodeAt(0).toString(16));
    }
  }) + '"';
}

function buildCoverageJson(coverageDatas) {
  var file, line, source, lines, coverage, array, length, value, json = [];
  for (file  in coverageDatas) {
    if (coverageDatas.hasOwnProperty(file)) {
      coverage = coverageDatas[file];
      array = [];
      length = coverage.length;
      for (line = 0; line < length; line += 1) {
        value = coverage[line];
        if (value === undefined || value === null) {
          value = 'null';
        }
        array.push(value);
      }
      source = coverage.source;
      lines = [];
      length = source.length;
      for (line = 0; line < length; line += 1) {
        lines.push(quote(source[line]));
      }
      json.push(quote(file) + ':{"coverage":[' + array.join(',') + '],"source":[' + lines.join(',') + ']}');
    }
  }
  return '{' + json.join(',') + '}';
}

function buildCoverageStats(coverage) {
  var i, file, srclinesTotal, srclinesCovered
    , stats = {
      packagesCovered:1,
      packagesTotal:1,
      classesCovered:0,
      classesTotal:0,
      methodsCovered:1,
      methodsTotal:1,
      srcfilesCovered:0,
      srcfilesTotal:0,
      srclinesCovered:0,
      srclinesTotal:0
    };
  for (file in coverage) {
    if (coverage.hasOwnProperty(file)) {
      stats.classesCovered += 1;
      stats.classesTotal += 1;
      stats.srcfilesCovered += 1;
      stats.srcfilesTotal += 1;
      srclinesTotal = 0;
      srclinesCovered = 0;
      for (i = 0; i < coverage[file].source.length; i += 1) {
        if (coverage[file][i + 1] !== void 0) {
          srclinesTotal += 1;
          if (coverage[file][i + 1] > 0) {
            srclinesCovered += 1;
          }
        }
      }
      stats.srclinesTotal += srclinesTotal;
      stats.srclinesCovered += srclinesCovered;
    }
  }
  return stats;
}

function buildCoverageSummary(stats, metric) {
  var covered = stats[metric + 'Covered']
    , total = stats[metric + 'Total']
    , coverage = Math.round(covered / total * 100);
  return coverage + '% (' + covered + '/' + total + ')';
}

function getCoverageDatas() {
  try {
    return this.globals._$jscoverage;
  } catch (e) {
  }
  return {};
}

function writeFile(filename, text) {
  var fd = fs.openSync(filename, 'w');
  fs.writeSync(fd, text, 0);
  fs.closeSync(fd);
}

function writeCoverageData(appPath, savePath, coverageDatas) {
  writeFile(savePath + 'jscoverage.json', buildCoverageJson(coverageDatas));
}

function writeEmmaReport(appPath, savePath, coverage) {
  var i, file, fileCover, srcLinesTotal, srcLinesCovered, relativeFilename
    , xml = []
    , coverageStats = buildCoverageStats(coverage);
  xml.push('<report>');
  xml.push('  <stats>');
  xml.push('    <packages value="' + coverageStats.packagesTotal + '"/>');
  xml.push('    <classes value="' + coverageStats.classesTotal + '"/>');
  xml.push('    <methods value="' + coverageStats.methodsTotal + '"/>');
  xml.push('    <srcfiles value="' + coverageStats.srcfilesTotal + '"/>');
  xml.push('    <srclines value="' + coverageStats.srclinesTotal + '"/>');
  xml.push('  </stats>');
  xml.push('  <data>');
  xml.push('    <all name="all classes">');
  xml.push('      <coverage type="class, %" value="' + buildCoverageSummary(coverageStats, 'classes') + '"/>');
  xml.push('      <coverage type="method, %" value="' + buildCoverageSummary(coverageStats, 'methods') + '"/>');
  xml.push('      <coverage type="block, %" value="' + buildCoverageSummary(coverageStats, 'methods') + '"/>');
  xml.push('      <coverage type="line, %" value="' + buildCoverageSummary(coverageStats, 'srclines') + '"/>');
  for (file in coverage) {
    if (coverage.hasOwnProperty(file)) {
      relativeFilename = path.relative(appPath, file);
      fileCover = coverage[file];
      srcLinesTotal = 0;
      srcLinesCovered = 0;
      for (i = 0; i < fileCover.source.length; i += 1) {
        if (fileCover[i + 1] !== void 0) {
          srcLinesTotal += 1;
          if (fileCover[i + 1] > 0) {
            srcLinesCovered += 1;
          }
        }
      }
      xml.push('      <srcfile name="' + relativeFilename + '">');
      xml.push('        <coverage type="line, %" value="'
        + (srcLinesCovered * 100 / srcLinesTotal)
        + '% (' + srcLinesCovered + '/' + srcLinesTotal + ')"/>');
      xml.push('      </srcfile>');
    }
  }
  xml.push('    </all>');
  xml.push('  </data>');
  xml.push('</report>');
  writeFile(savePath + 'coverage.xml', xml.join('\n'));
}

var EmmaReporter = function (appPath, savePath, done) {
  this.appPath = appPath;
  this.savePath = savePath;
  this.done = done;
};

EmmaReporter.prototype = {
  reportSpecStarting:function (spec) {
  },
  reportSpecResults:function (spec) {
  },
  reportSuiteResults:function (suite) {
  },
  reportRunnerResults:function (runner) {
    var coverage = _$jscoverage;
    writeEmmaReport(this.appPath, this.savePath, coverage);
    writeCoverageData(this.appPath, this.savePath, coverage);
    this.done(coverage);
  },
  log:function (str) {
    var console = jasmine.getGlobal().console;
    if (console && console.log) {
      console.log(str);
    }
  }
};

module.exports = EmmaReporter;