var fs = require('fs');
var util = require('util');
var path = require('path');
var cp = require('child_process');

var maxThreads = 10;
var currentThreads = 0;

function executeSpecsInFolder(folder, done, isVerbose, showColors, maxThreads, matcher) {
	var log = [];
	var columnCounter = 0;
	var start = 0;
	var elapsed = 0;
	var verbose = isVerbose || false;
	var fileMatcher = matcher || new RegExp(".(js)$", "i");
	var colors = showColors || false;
	var specs = getAllSpecFiles(folder, fileMatcher);
	
	var ansi = {
		green: '\033[32m',
		red: '\033[31m',
		yellow: '\033[33m',
		none: '\033[0m'
	};

	for (var i = 0, len = specs.length; i < len; ++i){
		queueSpec(specs[i], isVerbose, showColors);
	}
	
	synchronize(function() {
		printResults();
	});
};

function printResults() {
	console.log("Results!");
}

function synchronize(callback) {
	if (currentThreads > 0) {
		console.log("waiting");
		setTimeout(function() {
			synchronize(callback);
		}, 100);
	} else {
		console.log("complete");
		callback && callback();
	}
}

function queueSpec(filename, isVerbose, showColors) {
	var worker = cp.fork(__dirname + '/run.js');
	console.log("spawning worker for ", filename, worker.pid);
	
	while (currentThreads === maxThreads) {
		// Wait and try again
		wait(100);
	}
	
	currentThreads += 1;
	worker.on("message", processWorkerMessage);
	worker.on("exit", function() {
		currentThreads -= 1;
		console.log("worker exited", worker.pid, ", currentThreads = " + currentThreads);
	});
	
	worker.send({
		filename: filename,
		isVerbose: isVerbose,
		showColors: showColors
	});
}

function processWorkerMessage(message) {
	if (message.status) {
		util.print(message.status);
	}
	if (message.summary) {
		util.print("\n\n" + message.summary + "\n");
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
					try{
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

