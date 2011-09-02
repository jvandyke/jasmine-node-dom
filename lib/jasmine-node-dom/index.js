var fs = require('fs');
var util = require('util');
var path = require('path');
var cp = require('child_process');

var options;
var maxThreads = 10;
var currentThreads = 0;
var results = {
	totalCount: 0,
	failedCount: 0,
	suiteCount: 0,
	fileResults: []
};

function executeSpecsInFolder(folder, opts, callback) {
	options = opts;
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
		redBg: '\033[41m\033[1;37m',
		greenBg: '\033[42m\033[1;30m',
		white: '\033[0;37m',
		none: '\033[0m'
	};
	var resultsColor = ansi.greenBg;
	var exitCode = 1;
	var log = '';
	
	// Doing some formatting and sorting here since we want to sort by the
	// file paths.
	results.fileResults.sort(alphanum);
	results.fileResults.forEach(function(fileResult) {
		var fileLog = fileResult.log.join("\n");
		fileLog = fileLog.replace(/\n/mg, "\n  ");
		
		// Print filename, if needed.
		if (options.isVerbose || fileResult.results.failedCount > 0) {
			log += "\n\n" + ansi.yellow + '[' + fileResult.filename + ']' + ansi.none;
		}
		log += fileLog;
	});
	
	// Overall results
	msg += results.suiteCount + ' test' + ((results.suiteCount === 1) ? '' : 's') + ', ';
	msg += results.totalCount + ' assertion' + ((results.totalCount === 1) ? '' : 's') + ', ';
	msg += results.failedCount + ' failure' + ((results.failedCount === 1) ? '' : 's');
	
	if (results.failedCount > 0) {
		resultsColor = ansi.redBg;
		exitCode = 0;
	}
	
	util.print(log);
	util.print("\n\n" + resultsColor + ' ' + msg + ' ' + ansi.none + " \n");
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
		var worker = cp.fork(__dirname + '/worker.js');
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
		results.fileResults.push(message);
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
					var subfiles = getAllSpecFiles(filename, matcher);
					subfiles.forEach(function(result){
							specs.push(result);
					});
				}
			}
		}
	}
	return specs;
};

function alphanum(a, b) {
  a = a.filename.toLowerCase();
  b = b.filename.toLowerCase();
  
  function chunkify(t) {
    var tz = [], x = 0, y = -1, n = 0, i, j;

    while (i = (j = t.charAt(x++)).charCodeAt(0)) {
      var m = (i == 46 || (i >=48 && i <= 57));
      if (m !== n) {
        tz[++y] = "";
        n = m;
      }
      tz[y] += j;
    }
    return tz;
  }

  var aa = chunkify(a);
  var bb = chunkify(b);

  for (x = 0; aa[x] && bb[x]; x++) {
    if (aa[x] !== bb[x]) {
      var c = Number(aa[x]), d = Number(bb[x]);
      if (c == aa[x] && d == bb[x]) {
        return c - d;
      } else return (aa[x] > bb[x]) ? 1 : -1;
    }
  }
  return aa.length - bb.length;
}

exports.execute = executeSpecsInFolder;
