
'use strict';

var argv = require('optimist').argv;
var pack = require('./package.json');
var path = require('path');
var config = require(argv.config ? path.resolve(argv.config) : './config.json');
var fs = require('fs');
var _ = require('lodash');

var processOne = require('./lib/process');
var sitemap = require('./lib/sitemap');

var Algolia = require('algolia-search');
var client = new Algolia(config.cred.appid, config.cred.apikey);
var pages = client.initIndex(config.index.name);

// Welcome
console.log('Welcome to "%s" %s v%s', config.app, pack.name, pack.version);
console.log();

// Launch sitemap crawling
sitemap(config, function (sitemap, urls) {
	if (!urls.length) {
		console.log('Sitemap %s do not contains any urls', sitemap.url);
		return;
	}
	
	var results = _.map(urls, function (url, index) {
		var processResults = processOne(config, url, function (error, record) {
			if (!!error || !record) {
				console.error('Error! ' + error.message);
				if (!!error.pageNotFound && !!record) {
					pages.deleteObject(record.objectID, function (error, result) {
						console.log('Object ' + record.objectID + ' has been deleted');
					});
				}
				return;
			}
			pages.saveObject(record, function (error, result) {
				if (!!error) {
					console.log();
					console.error('Error! ' + (result.message || error.message));
					console.log();
				} else if (record.objectID !== result.objectID) {
					console.log();
					console.error('Error! Object ID mismatch!');
					console.log();
				} else {
					console.log('Object %s:%s saved (%s)', record.objectID, record.lang, record.url);
				}
			});
		});
		if (!processResults.ok) {
			console.error(processResults.message || 'Error!');
		}
	});
	
	console.log('Sitemap %s registered %s / %s urls', sitemap.url, results.length, urls.length);
});

// Configure index
console.log('Configuring your index %s', config.index.name);
pages.setSettings(config.index.settings, function (error, result) {
	if (!!error) {
		console.log();
		console.error('Error! Configuring index failed: ' + result.message);
		console.log();
	} else {
		console.log('Configured index properly');
		console.log();
	}
});