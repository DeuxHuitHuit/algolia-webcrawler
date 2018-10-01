/**
 * Pingback one url
 */

'use strict';

const URL = require('url');
const http = require('http');
const https = require('https');
const querystring = require('querystring');

module.exports = (config) => {
	const cfg = config;
	const url = cfg.url;
	
	const parsedUrl = URL.parse(url);
	const client = parsedUrl.protocol === 'https:' ? https : http;

	if (!parsedUrl.hostname) {
		return {
			ok: false,
			error: 'No hostname found for ' + url,
			send: () => {}
		};
	}

	const send = (data, cb) => {

		if (data && data.result && data.action && data.url) {
			
			const httpOptions = {
				hostname: parsedUrl.hostname,
				port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
				path: parsedUrl.path || '/',
				method: 'GET',
				auth: config.http && config.http.auth,
				headers: config.http && config.http.headers
			};

			var req = client.request(httpOptions, (res) => {
				let data = '';

				res.setEncoding('utf8');

				if (res.statusCode !== 200) {
					cb({
						ok: false,
						message: 'HTTP error ' + res.statusCode + ' ' + url
					});
					return;
				}

				//Grab all data
				res.on('data', (chunk) => {
					data += chunk;
				});

				//When done.
				res.on('end', (chunk, encoding) => {
					if (!!chunk) {
						data += chunk;
					}
					
					let error = null;

					//Process completed
					cb({
						ok: true
					});
				});
			});

			const postData =  querystring.stringify({
				result: data.result,
				action: data.action,
				url: data.url,
				source: 'algolia-crawler'
			});

			const callback = (err) => {
				cb({ok: false, err: err});
			};

			req.on('error', (e) => callback(e));

			req.write(postData);
			req.end();

		} else {
			cb({ok: false, message: 'Missing information for the ping back process.'});
		}
	};

	return {
		send: send,
		ok: true
	};
};
