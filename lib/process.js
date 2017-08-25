/**
 * Processes one url
 */

'use strict';

var crypto = require('crypto');
var cheerio = require('cheerio');
var URL = require('url');
var http = require('http');
var https = require('https');
var _ = require('lodash');
var _trim = require('trim');
var trim = function (s) {
	if (!s) {
		return null;
	}
	return _trim(s);
};
var entities = (function (H) {
	return new H.XmlEntities;
})(require('html-entities'));

var recursiveFindValue = function (node, array) {
	if (!node) {
		return array;
	}
	
	// Found a text node, use its value
	if (node.type === 'text' || !!node.data) {
		var text = trim(node.data);
		if (!!text) {
			array.push(entities.decode(text));
		}
	}
	// Node has children, check them
	if (!!node.children && !!node.children.length) {
		_.each(node.children, function (child) {
			recursiveFindValue(child, array);
		});
	}
	// Check some common attributes
	if (!!node.attribs) {
		_.each(['content', 'value'], function (key) {
			if (node.attribs[key]) {
				array.push(node.attribs[key]);
			}
		});
	}
	
	return array;
};

var isFetching = false;
var queue = [];
var pollTimer = 0;

(function poll() {
	if (!!queue.length && !isFetching) {
		var fetch = queue.pop();
		fetch();
	}
	pollTimer = setTimeout(poll, 100);
})();

var types = {
	'integer': function (value) {
		console.log('int');
		return parseInt(value, 10);
	}
};

var parse = function (record, data, config) {
	var $ = cheerio.load(data);
	
	// Process all selectors
	_.each(config.selectors, function (selector, key) {
		if (record[key] === undefined) {
			record[key] = [];
			var nodes = $(selector);
			// Populate the record
			_.each(nodes, function (node) {
				recursiveFindValue(node, record[key]);
			});
			
			// A formatter for this key does exists
			if (!!config.formatters && !!config.formatters[key]) {
				if (!_.isArray(config.formatters[key])) {
					config.formatters[key] = [config.formatters[key]];
				}
				// Format all values
				record[key] = _.map(record[key], function (value) {
					config.formatters[key].forEach(function (format) {
						if (!!format && !!format.replace) {
							value = trim(value.replace(format, ''));
						}
					});
					return value;
				});
			}
			
			// A type converter for this key does exists
			if (!!config.types && !!config.types[key]) {
				// Cast all values
				record[key] = _.map(record[key], function (value) {
					if (!!types[config.types[key]]) {
						return types[config.types[key]](value);
					}
				});
			}
			
			// The key currently has a falsy value and
			// a default value for this key does exists
			if (!record[key] && !!config.defaults && !!config.defaults[key]) {
				record[key] = config.defaults[key];
			}
		} else {
			throw new Error('Selector ' + key + ' is reserved');
		}
	});
	
	// Extract empty and single values
	_.each(record, function (value, key) {
		if (_.isArray(value)) {
			if (value.length === 0) {
				record[key] = null;
			} else if (value.length === 1) {
				record[key] = record[key][0];
			}
		}
	});
};

module.exports = function (data, cb) {
	var config = data.config;
	var url = data.url;
	var index = data.index;

	setTimeout(function () {
		var parsedUrl = URL.parse(url.url);
		var client = parsedUrl.protocol === 'https:' ? https : http;
		var httpOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
			path: parsedUrl.pathname || '/',
			method: 'GET',
			auth: config.http && config.http.auth,
			headers: config.http && config.http.headers
		};
		
		if (!httpOptions.hostname) {
			return {
				url: url,
				ok: false,
				error: 'No hostname found'
			};
		}
		
		var callback = function (err, data) {
			isFetching = false;
			cb(err, data);
		};
		
		var fetch = function () {
			var shasum = crypto.createHash('sha1');
			shasum.update(url.url, 'utf8');
			
			isFetching = true;
			
			var req = client.request(httpOptions, function (res) {
				var data = '';
				var now = new Date();
				var meta = {
					date: now,
					timestamp: now.getTime(),
					url: url.url,
					objectID: shasum.digest('base64'),
					lang: url.lang
				};
				var record = _.clone(meta);
				
				res.setEncoding('utf8');
				
				if (res.statusCode === 404) {
					callback({
						message: 'Page not found ' + url.url,
						pageNotFound: true
					}, record);
					return;
				} else if (res.statusCode !== 200) {
					callback({
						message: 'HTTP error ' + res.statusCode + ' ' + url.url
					});
					return;
				}
				
				res.on('data', function (chunk) {
					data += chunk;
				});
				
				res.on('end', function (chunk, encoding) {
					if (!!chunk) {
						data += chunk;
					}
					
					var error = null;
					
					try {
						parse(record, data, config);
					} catch (ex) {
						error = ex;
					} finally {
						callback(error, record);
					}
				});
			});
			
			req.on('error', function (e) {
				callback(e);
			});
			
			req.end();
		};
		
		queue.push(fetch);
	}, config.delayBetweenRequest * index);
	
	return {
		url: url,
		ok: true
	};
};

module.exports.stop = function () {
	clearTimeout(pollTimer);
	queue = [];
};
