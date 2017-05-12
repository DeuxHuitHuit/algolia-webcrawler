/**
 * Parse sitemaps
 */

'use strict';

var _ = require('lodash');
var URL = require('url');
var http = require('http');
var https = require('https');
var cheerio = require('cheerio');

module.exports = function (config, cb) {
	_.each(config.sitemaps, function (sitemap) {
		var urls = [];
		var parsedUrl = URL.parse(sitemap.url);
		var httpOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
			path: parsedUrl.path,
			method: 'GET',
			auth: config.http && config.http.auth
		};
		var client = parsedUrl.protocol === 'https:' ? https : http;
		
		var req = client.request(httpOptions, function (res) {
			var data = '';
			
			res.setEncoding('utf8');
			
			if (res.statusCode !== 200) {
				console.error('Status code returned ' + res.statusCode);
				cb(sitemap, urls);
				return;
			}
			
			res.on('data', function (chunk) {
				data += chunk;
			});
			
			res.on('end', function (chunk, encoding) {
				if (!!chunk) {
					data += chunk;
				}
				
				try {
					var $ = cheerio.load(data);
					
					_.each($('url > loc'), function (loc) {
						//console.log(loc.children);
						if (!!loc.children.length > 0) {
							urls.push({
								url: loc.children[0].data,
								lang: sitemap.lang
							});
						} else {
							console.error('No url found for ' + loc);
						}
					});
					
				} catch (ex) {
					console.error(ex.message);
					console.log(ex.stack);
				} finally {
					cb(sitemap, urls);
				}
			});
		});
		
		req.on('error', function (e) {
			console.error(e.message);
			cb(sitemap, urls);
		});
		
		req.end();
	});
};