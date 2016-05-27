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

var content = function ($, selector) {
	var node = $(selector)[0];
	if (!node || !node.attribs) {
		return null;
	}
	return node.attribs.content;
};

var recursiveFind = function (node, array) {
	if (!node) {
		return array;
	}
	
	if (node.type === 'text' || !!node.data) {
		var text = trim(node.data);
		if (!!text) {
			array.push(entities.decode(text));
		}
	} else if (!!node.children.length) {
		_.each(node.children, function (child) {
			recursiveFind(child, array);
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

var parse = function (record, data, config) {
	var $ = cheerio.load(data);
	
	// Special treatment for title
	if (!_.isArray(config.formatters.title)) {
		config.formatters.title = [config.formatters.title];
	}
	record.title = trim(
		recursiveFind($(config.selectors.title)[0], [])
		.join('')
	);
	config.formatters.title.forEach(function (title) {
		if (!!record.title && !!title && !!title.replace) {
			record.title = trim(record.title.replace(title, ''));
		}
	});
	
	// Special treatment for text
	var elements = $(config.selectors.text);
	elements.each(function (index, element) {
		recursiveFind(element, record.text);
	});
	
	// Process all other selectors
	_.each(config.selectors, function (selector, key) {
		if (record[key] === undefined) {
			record[key] = trim(content($, selector));
			if (!!record[key] && !!config.formatters[key]) {
				if (!_.isArray(config.formatters[key])) {
					config.formatters[key] = [config.formatters[key]];
				}
				config.formatters[key].forEach(function (format) {
					if (!!record[key] && !!format && !!format.replace) {
						record[key] = trim(record[key].replace(format, ''));
					}
				});
			}
			if (!record[key] && !!config.defaults[key]) {
				record[key] = config.defaults[key];
			}
		};
	});
}

module.exports = function (config, url, cb) {
	var parsedUrl = URL.parse(url.url);
	var client = parsedUrl.protocol === 'https:' ? https : http;
	var httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
		path: parsedUrl.pathname || '/',
		method: 'GET',
		auth: config.http.auth
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
			var record = {
				date: now,
				timestamp: now.getTime(),
				url: url.url,
				objectID: shasum.digest('base64'),
				lang: url.lang,
				title: '',
				description: undefined,
				image: undefined,
				text: []
			};
			
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
			console.error(e.message);
		});
		
		req.end();
	};
	
	queue.push(fetch);
	
	return {
		url: url,
		ok: true
	};
};

module.exports.stop = function () {
	clearTimeout(pollTimer);
	queue = [];
};
