"use strict";

module.exports = function(grunt) {

  
  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
        banner: '#!/usr/bin/env node'
    },
    concat: {
        dist: {
            src: ['<banner>', '<file_strip_banner:lib/jira.js>'],
            dest: 'lib/jira.js'
        } 
    },
    lint: {
      files: ['grunt.js', 'lib/**/!(jasmine-1.3.1).js']
    },
    watch: {
      files: ['lib/**/*.js','spec/**/*'],
      tasks: 'default'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true
      },
      globals: {
        exports: true,
        afterEach: true,
        beforeEach: true,
        describe: true,
        expect: true,
        it: true,
        jasmine: true,
        runs: true,
        spyOn: true,
        waits: true,
        waitsFor: true,
        xdescribe: true,
        xit: true
      }
    },
    docco: {
        app: {
            src: ['src/*.coffee']
        }
    }
    
  });

  // Default task.
  grunt.registerTask('default', 'lint');

  //grunt.loadNpmTasks('grunt-docco');
  //grunt.loadNpmTasks('grunt-bump');
};
