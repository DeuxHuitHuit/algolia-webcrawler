/**
 * Processes one url
 */

'use strict';

const crypto = require('crypto');
const cheerio = require('cheerio');
const URL = require('url');
const http = require('http');
const https = require('https');
const _ = require('lodash');
const _trim = require('trim');
const trim = (s) => !s ? null : _trim(s);
const entities = (H => new H.XmlEntities)(require('html-entities'));
const defaultAttributes = ['content', 'value'];

const recursiveFindValue = (node, array, attribs) => {
	if (!node ||  node.type === 'comment') {
		return array;
	}
	
	// First, if we found a text node, use its value
	if (node.type === 'text' || !!node.data) {
		let text = trim(node.data);
		if (!!text) {
			array.push(entities.decode(text));
			// No need to check further
			return array;
		}
	}
	// Then check attributes
	if (!!node.attribs) {
		let found = false;
		if (!attribs) {
			attribs = defaultAttributes;
		} else if (!_.isArray(attribs)) {
			attribs = [attribs];
		}
		_.each(attribs, (key) => {
			if (node.attribs[key]) {
				array.push(node.attribs[key]);
				found = true;
			}
		});
		if (found) {
			// return here, to no check children
			return array;
		}
	}
	// If node has children, check them
	if (!!node.children && !!node.children.length) {
		_.each(node.children, (child) => {
			recursiveFindValue(child, array, attribs);
		});
	}
	
	return array;
};

let isFetching = false;
let queue = [];
let pollTimer = false;

const poll = () => {
	if (!pollTimer) {
		return;
	}
	if (!!queue.length && !isFetching) {
		var fetch = queue.pop();
		fetch();
	}
	setImmediate(poll);
};

const types = {
	'integer': (value) => parseInt(value, 10),
	'float': (value) => parseFloat(value),
	'json': (value) => JSON.parse(value),
	'boolean': (value) => {
		if (value === 'false' || value === '0' || value === 'no' || !value) {
			return false;
		}
		return !!value;
	}
};

const parse = (record, data, config) => {
	const $ = cheerio.load(data);
	
	// Process all selectors
	_.each(config.selectors, (selector) => {
		const key = selector.key;
		if (record[key] === undefined) {
			record[key] = [];
			// Fetch all and filter exclusions
			const nodes = $(selector.selector).filter((i, node) => {
				return !selector.exclude || $(node).closest(selector.exclude).length === 0;
			});

			// Populate the record
			_.each(nodes, (node) => recursiveFindValue(node, record[key], selector.attributes));
			
			// A formatter for this key does exists
			if (!!config.formatters && !!config.formatters[key]) {
				if (!_.isArray(config.formatters[key])) {
					config.formatters[key] = [config.formatters[key]];
				}
				// Format all values
				record[key] = _.map(record[key], (value) => {
					config.formatters[key].forEach((format) => {
						if (!!format && !!format.replace) {
							value = trim(value.replace(format, ''));
						}
					});
					return value;
				});
			}
			
			// A type converter for this key does exists
			if (!!config.types && !!config.types[key] && !!types[config.types[key]]) {
				// Cast all values
				record[key] = _.map(record[key], (value) => {
					return types[config.types[key]](value);
				});
			}
			
			// The key currently has a falsy value and
			// a default value for this key does exists
			if ((!record[key] || !record[key].length) && !!config.defaults && !!config.defaults[key]) {
				record[key] = config.defaults[key];
			}
		} else {
			throw new Error(`Selector ${key} is reserved or already defined`);
		}
	});
	
	// Extract empty and single values
	_.each(record, (value, key) => {
		if (_.isArray(value)) {
			value = [].concat.apply([], value);
			if (value.length === 0) {
				record[key] = null;
			} else if (value.length === 1) {
				record[key] = value[0];
			} else {
				record[key] = value;
			}
		}
	});
};

const trimmer = (record, config) => {
	const bytes = (s) => { return ~-encodeURI(s).split(/%..|./).length }
	const jsonSize = (s) => { return bytes(JSON.stringify(s)) }
	const limit = config.maxRecordSize;
	
	while (jsonSize(record) > limit && record.text.length > 0) {
		record.text.pop();
	}
};

module.exports = (data, cb) => {
	const config = data.config;
	const plugins = data.plugins;
	const url = data.url;
	const action = data.url.action;
	const parsedUrl = URL.parse(url.url);
	const client = parsedUrl.protocol === 'https:' ? https : http;
	const httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
		path: parsedUrl.path || '/',
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

	if (!pollTimer) {
		pollTimer = true;
		poll();
	}
	const fetch = () => {
		const shasum = crypto.createHash('sha1');
		shasum.update(url.url, 'utf8');

		if (action === 'delete') {
			//Quick delete
			process.nextTick(() => {
				cb(null, {
					ok: true,
					action: action,
					url: url.url,
					lang: url.lang,
					objectID: shasum.digest('base64')
				});
			});
		} else {
			//Fetch page
			var req = client.request(httpOptions, (res) => {
				let data = '';
				const now = new Date();
				const meta = {
					date: now,
					timestamp: now.getTime(),
					url: url.url,
					objectID: shasum.digest('base64'),
					lang: url.lang,
					http: {
						expires: res.headers['expires'],
						lastModified: res.headers['last-modified']
					}
				};
				const record = _.clone(meta);
				
				res.setEncoding('utf8');
				if (res.statusCode === 404) {
					cb({
						ok: 'warn',
						message: 'Page not found ' + url.url,
						pageNotFound: true
					}, record);
					return;
				} else if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
					cb({
						ok: 'warn',
						message: 'Page redirected ' + url.url + ' to ' + res.headers.location,
						pageRedirected: true
					}, record);
					return;
				} else if (res.statusCode !== 200) {
					cb({
						ok: false,
						message: 'HTTP error ' + res.statusCode + ' ' + url.url,
						retry: !data.isRetry // Retry once
					});
					return;
				}
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', (chunk, encoding) => {
					let error = null;

					if (!!chunk) {
						data += chunk;
					}
					
					try {
						parse(record, data, config);
						trimmer(record, config);
						plugins(record, data);
					} catch (ex) {
						error = ex;
					} finally {
						cb(error, record);
					}
				});
			});
			req.on('error', (e) => cb(e));
			req.end();
		}
	};
	
	queue.push(() => {
		isFetching = true;
		setTimeout(fetch, config.delayBetweenRequests || config.delayBetweenRequest || 0);
	});
	
	return {
		url: url,
		ok: true,
		action: action
	};
};

module.exports.stop = () => {
	isFetching = false;
	queue = [];
	pollTimer = false;
};

module.exports.start = poll;

module.exports.parse = parse;

module.exports.trimmer = trimmer;

module.exports.resume = () => {
	isFetching = false;
}
