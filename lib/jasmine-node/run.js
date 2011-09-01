var fs = require('fs');

var filename = __dirname + '/jasmine-1.0.1.js';
global.window = {
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
};

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

delete global.window;

process.on("message", function(msg) {
	if (typeof msg.filename === "string") {
		runSpec(msg.filename, msg.isVerbose, msg.showColors);
	}
});

var runSpec = function(filename, isVerbose, showColors) {
	var log = [];
	var columnCounter = 0;
	var start = 0;
	var elapsed = 0;
	var verbose = isVerbose || false;
	var colors = showColors || false;
	
	var ansi = {
		green: '\033[32m',
		red: '\033[31m',
		yellow: '\033[33m',
		none: '\033[0m'
	};

	require(filename.replace(/\.\w+$/, ""));

	var jasmineEnv = jasmine.getEnv();
	jasmineEnv.reporter = {
		log: function(str){
		},

		reportSpecStarting: function(runner) {
		},

		reportRunnerStarting: function(runner) {
			start = Number(new Date);
		},

		reportSuiteResults: function(suite) {
			var specResults = suite.results();
			var path = [];
			while(suite) {
				path.unshift(suite.description);
				suite = suite.parentSuite;
			}
			var description = path.join(' ');

			if (verbose)
				log.push('Spec ' + description);

			specResults.items_.forEach(function(spec){
				if (spec.failedCount > 0 && spec.description) {
					if (!verbose)
							log.push(description);
					log.push('  it ' + spec.description);
					spec.items_.forEach(function(result){
						log.push('  ' + result.trace.stack + '\n');
					});
				} else {
					if (verbose)
							log.push('  it ' + spec.description);
				}
			});
		},

		reportSpecResults: function(spec) {
			var result = spec.results();
			var msg = '';
			if (result.passed()) {
				msg = (colors) ? (ansi.green + '.' + ansi.none) : '.';
			} else {
				msg = (colors) ? (ansi.red + 'F' + ansi.none) : 'F';
			}
			sendStatus(msg);
		},


		reportRunnerResults: function(runner) {
			elapsed = (Number(new Date) - start) / 1000;
			
			var suites = runner.suites();
			var results = runner.results();
			
			sendResults(log, suites, results, elapsed);
			process.exit(results.failedCount > 0 ? 0 : 1);
		}
	};
	jasmineEnv.execute();
};

var sendStatus = function(msg) {
	process.send({
		status: msg
	});
};

var sendResults = function(log, suites, results, elapsed) {
	process.send({
		log: log,
		suiteCount: suites.length,
		results: results,
		elapsed: elapsed
	});
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
