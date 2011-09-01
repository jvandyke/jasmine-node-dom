var jasmine = require('jasmine-node');
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
	maxThreads: 10
}
var args = process.argv.slice(2);

while(args.length) {
	var arg = args.shift();
	
	switch(arg) {
		case '--color':
			options.showColors = true;
			break;
		case '--noColor':
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
			var dir = args.shift();
			
			if(!Path.existsSync(dir))
				throw new Error("Include path '" + dir + "' doesn't exist!");
			
			require.paths.unshift(dir);
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

options.matcher = new RegExp(options.match + "spec\\.(" + options.extentions + ")$", 'i');

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
	, '  --color            - use color coding for output'
	, '  --noColor          - do not use color coding for output'
	, '  -m, --match REGEXP - load only specs containing "REGEXPspec"'
	, '  -n, --numthreads NUMBER - Maximum number of tests to run at one time'
	, '  -i, --include DIR  - add given directory to node include paths'
	, '  --verbose          - print extra information per each test run'
	, '  --coffee           - load coffee-script which allows execution .coffee files'
	, ''
	].join("\n"));
	
	process.exit(1);
}
