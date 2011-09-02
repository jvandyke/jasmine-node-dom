var _ = require("underscore");
var jasmine = require('./jasmine-env.js').jasmine;

process.on("message", function(msg) {
	if (typeof msg.filename === "string") {
		runSpec(msg.filename, msg.options);
	}
});

var options = {
	verbose: false,
	colors: true
};
var log =[];
var ansi = {
	green: '\033[32m',
	red: '\033[31m',
	yellow: '\033[33m',
	none: '\033[0m'
};

var runSpec = function(filename, opts) {
	_.extend(options, opts);
	if (options.showColors === false) {
		_.each(ansi, function(value, key) {
			ansi[key] = '';
		});
	}
	var start = 0;
	var elapsed = 0;
	
	require(filename.replace(/\.\w+$/, ""));

	var jasmineEnv = jasmine.getEnv();
	jasmineEnv.reporter = {
		log: function(str){},
		reportSpecStarting: function(runner) {},
		
		reportRunnerStarting: function(runner) {
			start = Number(new Date);
		},
		
		reportSuiteResults: function(suite) {
			var specResults = suite.results();
			var path = [];
			var suitePrinted = false;
			while(suite) {
				path.unshift(suite.description);
				suite = suite.parentSuite;
			}
			var description = path.join(' ');
			
			
			specResults.items_.forEach(function(spec) {
				if (!suitePrinted) {
					if (spec.failedCount > 0 && spec.description) {
						// Force suite name added to log if there are errors.
						addToLog('\n' + description +':');
					} else {
						printLog('\n' + description + ':');
					}
					suitePrinted = true;
				}
				if (spec.failedCount > 0 && spec.description && typeof spec.description !== "undefined") {
					var errorStr = '  it ' + spec.description + "\n";
					spec.items_.forEach(function(result){
						var stacktrace = result.trace.stack;
						var stacktraceLines = stacktrace.split("\n");
						var filteredStacktrace = '';
						
						// Remove trace lines that refer to the inner workings on Jasmine. Who cares.
						stacktraceLines.forEach(function(line) {
							if ( !/\/jasmine[^\/]*?js/.test(line) ) {
								filteredStacktrace += line + "\n";
							}
						});
						
						stacktrace = filteredStacktrace.replace(/\n/mg, "\n  ").replace(/\s+$/m, '');
						errorStr += '    ' + stacktrace;
					});
					printError(errorStr);
				} else {
					printSuccess('  it ' + spec.description);
				}
			});
		},
		
		reportSpecResults: function(spec) {
			var result = spec.results();
			var msg = '';
			if (result.passed()) {
				msg = (options.colors) ? (ansi.green + '.' + ansi.none) : '.';
			} else {
				msg = (options.colors) ? (ansi.red + 'F' + ansi.none) : 'F';
			}
			sendStatus(msg);
		},
		
		reportRunnerResults: function(runner) {
			elapsed = (Number(new Date) - start) / 1000;
			
			var suites = runner.suites();
			var results = runner.results();
			sendResults(filename, suites, results, elapsed);
			process.exit(results.failedCount > 0 ? 0 : 1);
		}
	};
	jasmineEnv.execute();
};

function printLog(msg) {
	if (options.verbose) {
		addToLog(msg);
	}
}

function printError(msg) {
	addToLog("✘ " + msg, ansi.red);
}

function printSuccess(msg) {
	if (options.verbose) {
		addToLog("✔ " + msg, ansi.green);
	}
}

function addToLog(msg, color) {
	if (options.colors && color) {
		msg = color + msg + ansi.none;
	}
	log.push(msg);
}

var sendStatus = function(msg) {
	process.send({
		status: msg
	});
};

var sendResults = function(filename, suites, results, elapsed) {
	process.send({
		log: log,
		filename: filename,
		suiteCount: suites.length,
		results: results,
		elapsed: elapsed
	});
};
