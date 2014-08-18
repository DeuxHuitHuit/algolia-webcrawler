/**
 * Processes one url
 */

'use strict';

var crypto = require('crypto');
var cheerio = require('cheerio');
var URL = require('url');
var http = require('http');
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

module.exports = function (config, url, cb) {
	var parsedUrl = URL.parse(url.url);
	var httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || 80,
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
	
	var shasum = crypto.createHash('sha1');
	shasum.update(url.url, 'utf8');
	
	http.request(httpOptions, function (res) {
		var data = '';
		var record = {
			date: new Date(),
			url: url.url,
			objectID: shasum.digest('base64'),
			lang: url.lang,
			title: '',
			description: '',
			image: '',
			text: []
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
		
		
		res.setEncoding('utf8');
		
		if (res.statusCode === 404) {
			cb({
				message: 'Page not found ' + url.url,
				pageNotFound: true
			}, record);
			return;
		} else if (res.statusCode !== 200) {
			cb({message: 'HTTP error ' + res.statusCode});
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
				var $ = cheerio.load(data);
				
				record.title = trim(
					recursiveFind($(config.selectors.title)[0], [])
					.join('')
					.replace(config.formatters.title, '')
				);
				record.description = trim(
					content($, config.selectors.description)
				);
				record.image = trim(
					content($, config.selectors.image)
				);
				
				var elements = $(config.selectors.text);
				
				elements.each(function (index, element) {
					recursiveFind(element, record.text);
				});
				
			} catch (ex) {
				error = ex;
			} finally {
				cb(error, record);
			}
		});
	}).end();
	
	return {
		url: url,
		ok: true
	};
};