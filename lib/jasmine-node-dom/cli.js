var jasmine = require('./index.js');
var util = require('util'),
    Path= require('path');


var specFolder = null;

for (var key in jasmine) {
	global[key] = jasmine[key];
}

options = {
	isVerbose: false,
	showColors: true,
	extentions: "js",
	match: '.',
	maxThreads: 10,
	includes: []
}

var args = process.argv.slice(2);

while (args.length) {
	var arg = args.shift();
	
	switch(arg) {
		case '--color':
			options.showColors = true;
			break;
		case '--nocolor':
			options.showColors = false;
			break;
		case '--verbose':
			options.isVerbose = true;
			break;
		case '--coffee':
			require('coffee-script');
			options.extentions = "js|coffee";
			break;
		case '-m':
		case '--match':
			options.match = args.shift();
			break;
		case '-i':  
		case '--include':
			var file = args.shift();
			
			if (!Path.existsSync(file)) {
				throw new Error("Include file '" + file + "' doesn't exist!");
			}
			
			options.includes.push(file);
			break;
		case '-n':
		case 'numthreads':
			options.maxThreads = args.shift();
			break;
		default:
			if (arg.match(/^--/)) help();
			specFolder = Path.join(process.cwd(), arg);
			break;
	}
}

if (!specFolder) {
	help();
}

options.matcher = new RegExp(".*?" + options.match + "spec\\.(" + options.extentions + ")$", 'i');

util.print("\n");
jasmine.execute(specFolder, options, function(results){
	if (results.failedCount == 0) {
		process.exit(0);
	} else {
		process.exit(1);
	}
});

function help(){
	util.print([ 
		'USAGE: jasmine-node [--color|--noColor] [--verbose] [--coffee] directory'
	, ''
	, 'Options:'
	, '  --color                 - use color coding for output'
	, '  --noColor               - do not use color coding for output'
	, '  -m, --match REGEXP      - load only specs containing "REGEXPspec"'
	, '  -n, --numthreads NUMBER - Maximum number of tests to run at one time'
	, '  -i, --include FILE      - include given file in tests'
	, '  --verbose               - print extra information per each test run'
	, '  --coffee                - load coffee-script which allows execution .coffee files'
	, ''
	].join("\n"));
	
	process.exit(1);
}
