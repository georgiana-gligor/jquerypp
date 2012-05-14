steal('steal/build', 'steal/build/pluginify', function(steal) {
	var contents = {},
	modules = {},
	inexcludes = function(excludes, src) {
		for(var i = 0; i < excludes.length; i++) {
			if(src.indexOf(excludes[i]) !== -1) {
				return true;
			}
		}
		return false;
	},
	/**
	 * Creates a variable name from a filename or AMD module name.
	 *
	 * @param {String} name The name of the AMD module or file
	 * @return {String} The variable name
	 */
	variableName = function(name) {
		var start = name.lastIndexOf('/') + 1,
			end = name.lastIndexOf('.') !== -1 ? name.lastIndexOf('.') : name.length;
		return '__' + name.substring(start, end).replace(/\./g, '_');
	},
	/**
	 * Returns a steal.File instance from a filename or AMD module name.
	 *
	 * @param name
	 * @param suffix
	 * @return {*}
	 */
	getFile = function(name, suffix) {
		var suffix = suffix || '.js', file = name;
		if(name.indexOf(suffix, name.length - suffix.length) === -1) {
			file = file + suffix;
		}
		return steal.File(file);
	},
	/**
	 * Returns a list of steal dependencies for a given file and caches
	 * the plain content.
	 *
	 * @param {String} file The JavaScript file to load
	 * @param {Array} excludes A list of dependencies to exclude
	 * @param {Object} options Options
	 * @param {Function} callback A callback getting passed an array
	 * of steals
	 */
	getDependencies = function(file, excludes, options, callback) {
		steal.build.open("steal/rhino/empty.html", {
			startFile : file,
			skipCallbacks: true
		}, function(opener){
			var ret = [];
			opener.each(function(stl, text){
				if(!inexcludes(excludes || [], stl.rootSrc)) {
					// Add the parsed content to cache
					if(!contents[stl.rootSrc]) {
						contents[stl.rootSrc] = steal.build.pluginify.content(stl, options, text);
					}
					ret.push(stl);
				}
			});
			callback(ret);
		}, null);
	},
	/**
	 * Creates the actual module recursively
	 * @param {String} name The name of the main module file
	 * @param {Array} excludes A list of files to exclude
	 * @param {Object} options The options to use
	 */
	createModule = function(name, excludes, options) {
		getDependencies(name, excludes, options, function(steals) {
			var content,
				dependencies = [],
				names = [],
				nameMap = options.names || {},
				map = options.map || {},
				where = getFile(options.out + (map[name] || name));

			print('  ' + name + ' -> ' + (map[name] || name));

			steals.forEach(function(stl) {
				var current = (map[stl.rootSrc] || stl.rootSrc);
				if(stl.rootSrc !== name) { // Don't include the current file
					if(!modules[stl.rootSrc]) {
						createModule(stl.rootSrc, excludes, options);
					}
					dependencies.push("'" + current + "'");
					names.push(nameMap[current] || variableName(current));
				}
			});

			content = "define([" +
				dependencies.join(',') +
				'], function(' +
				names.join(', ') +
				') { \n' +
				(contents[name] || (' return ' + (options.global || '{}'))) +
				';\n})';

			modules[name] = content;

			steal.File(where.dir()).mkdirs();
			where.save(content);
		});
	};

	/**
	 * Creates a deliverable AMD module
	 *
	 * @param source
	 * @param options
	 */
	steal.build.amdify = function(source, options) {
		var out = options.out;
		print('Creating AMD modules for ' + source + " in " + options.out);
		steal.File(out).mkdirs();
		createModule(source, options.excludes || {}, options);
	}

});
