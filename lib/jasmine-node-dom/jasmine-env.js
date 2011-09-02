var fs = require('fs');
var vm = require('vm');
var jsdom    = require("jsdom").jsdom,
    document = jsdom("<html><head></head><body></body></html>"),
    window   = document.createWindow();

global.load = function(file) {
    var src = fs.readFileSync(file);
    vm.runInThisContext(src + "\n;", file);
};

global.document = document;
global.window = window;
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;
global.window.setInterval = setInterval;
global.window.clearInterval = clearInterval;
//delete global.window;

var filename = __dirname + '/jasmine-1.0.1.js';
var src = fs.readFileSync(filename);
var jasmine;
var minorVersion = process.version.match(/\d\.(\d)\.\d/)[1];

switch (minorVersion) {
  case "1":
  case "2":
    jasmine = process.compile(src + '\njasmine;', filename);
    break;
  default:
    jasmine = require('vm').runInThisContext(src + "\njasmine;", filename);
}

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

exports['jsdom'] = jsdom,
exports['document'] = document,
exports['window'] = window,
exports['jasmine'] = jasmine
