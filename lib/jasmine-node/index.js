var fs = require('fs');
var util = require('util');
var path = require('path');
var cp = require('child_process');

var maxThreads = 10;
var currentThreads = 0;
var results = {
	totalCount: 0,
	failedCount: 0,
	suiteCount: 0,
	logs: []
};

function executeSpecsInFolder(folder, options, callback) {
	var fileMatcher = options.matcher || new RegExp(".(js)$", "i");
	var specs = getAllSpecFiles(folder, fileMatcher);
	maxThreads = options.maxThreads;
	
	for (var i = 0, len = specs.length; i < len; ++i){
		queueSpec(specs[i], options.isVerbose, options.showColors);
	}
	
	synchronize(function() {
		printResults();
	});
};

function printResults() {
	var msg = '';
	var ansi = {
		green: '\033[32m',
		red: '\033[31m',
		yellow: '\033[33m',
		none: '\033[0m'
	};
	var resultsColor = ansi.green;
	var exitCode = 1;
	
	msg += results.logs.join("\n\n");
	msg += results.suiteCount + ' test' + ((results.suiteCount === 1) ? '' : 's') + ', ';
	msg += results.totalCount + ' assertion' + ((results.totalCount === 1) ? '' : 's') + ', ';
	msg += results.failedCount + ' failure' + ((results.failedCount === 1) ? '' : 's') + '\n';
	
	if (results.failedCount > 0) {
		resultsColor = ansi.red;
		exitCode = 0;
	}
	
	util.print("\n\n" + resultsColor + msg + ansi.none);
}

function synchronize(callback) {
	if (currentThreads > 0) {
		setTimeout(function() {
			synchronize(callback);
		}, 100);
	} else {
		callback && callback();
	}
}

function queueSpec(filename, isVerbose, showColors) {
	if (currentThreads === maxThreads) {
		// Wait and try again
		setTimeout(function() {
			queueSpec.apply(this, arguments);
		}, 100);
	} else {
		currentThreads += 1;
		var worker = cp.fork(__dirname + '/run.js');
		worker.on("message", processWorkerMessage);
		worker.on("exit", function() {
			currentThreads -= 1;
		});
		
		worker.send({
			filename: filename,
			isVerbose: isVerbose,
			showColors: showColors
		});
	}
}

function processWorkerMessage(message) {
	if (message.status) {
		util.print(message.status);
	}
	if (message.results) {
		results.logs.concat(message.logs);
		results.suiteCount += message.suiteCount;
		results.totalCount += message.results.totalCount;
		results.failedCount += message.results.failedCount;
	}
}

function getAllSpecFiles(dir, matcher) {
	var specs = [];
	if (fs.statSync(dir).isFile() && dir.match(matcher)) {
		specs.push(dir);
	} else {
		var files = fs.readdirSync(dir);
		for (var i = 0, len = files.length; i < len; ++i) {
			var filename = dir + '/' + files[i];
			// fs.fstatSync will pass ENOENT from stat(2) up
			// the stack. That's not particularly useful right now,
			// so try and continue...
			try {
				isFile = fs.statSync(filename).isFile();
			} catch (err) {
				if (err.code === 'ENOENT') {
					isFile = false;
				}
				else {
					throw err;
				}
			}
			if (filename.match(matcher) && isFile) {
				specs.push(filename);
			} else {
				try {
					isDir = fs.statSync(filename).isDirectory();
				} catch (err) {
					if (err.code === 'ENOENT') {
						isDir = false;
					} else {
						throw err;
					}
				}
				if (isDir){
					var subfiles = this.getAllSpecFiles(filename, matcher);
					subfiles.forEach(function(result){
							specs.push(result);
					});
				}
			}
		}
	}
	return specs;
};

exports.execute = executeSpecsInFolder;
