#!/usr/bin/env node

/**
 * App
 */

'use strict';

var argv = require('optimist').argv;
var pack = require('./package.json');
var path = require('path');
var config = require(argv.config ? path.resolve(argv.config) : './config.json');
var fs = require('fs');
var u = require('url');
var _ = require('lodash');

var processOne = require('./lib/process');
var sitemap = require('./lib/sitemap');
var dns = require('./lib/dns-cache');
var sitemapCount = 0;
var urlCount = 0;

var algoliasearch = require('algoliasearch');
var client = algoliasearch(config.cred.appid, config.cred.apikey);
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
	
	console.log('Parsing Sitemap %s', sitemap.url);
	
	var totalCount = urls.length;
	if (_.isArray(config.blacklist)) {
		urls = _.filter(urls, function (url) {
			return _.every(_.map(config.blacklist, function (bl) {
				return url.url !== bl && u.parse(url.url).path !== bl;
			}));
		});
		if (totalCount != urls.length) {
			console.log('%s blacklisted %d urls', sitemap.url, totalCount - urls.length);
		}
	}
	
	sitemapCount += urls.length;
	
	var results = _.map(urls, function (url, index) {
		console.log('Registered ' + url.url);
		var processResults = processOne(config, url, function (error, record) {
			if (!!error || !record) {
				console.error('Error! ' + error.message);
				if (!!error.pageNotFound && !!record) {
					pages.deleteObject(record.objectID, function (error, result) {
						console.log('Object ' + record.objectID + ' has been deleted');
					});
				}
				removeOldEntries();
				return;
			}
			
			pages.saveObject(record, function (error, result) {
				if (!!error) {
					console.log();
					if (!!result && !!result.message) {
						console.error('Error! ' + result.message);
					}
					if (!!error && !!error.message) {
						console.error('Error! ' + error.message);
					}
					console.log();
				} else if (record.objectID !== result.objectID) {
					console.log();
					console.error('Error! Object ID mismatch!');
					console.log();
				} else {
					console.log('Object %s:%s saved (%s)', record.objectID, record.lang, record.url);
				}
				removeOldEntries();
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
		if (!!result && !!result.message) {
			console.error('Error! ' + result.message);
		}
		if (!!error && !!error.message) {
			console.error('Error! ' + error.message);
		}
		console.log();
	} else {
		console.log('Configured index properly');
		console.log();
	}
});

var removeOldEntries = function () {
	urlCount++;
	if (urlCount === sitemapCount && !!config.oldentries) {
		processOne.stop();
		console.log()
		console.log('Removing old entries...');
		pages.deleteByQuery('*', {
			numericFilters: ['timestamp<' + (new Date().getTime() - config.oldentries)]
		}, function (error, content) {
			if (!!error) {
				console.error('Error deleting entries.');
				return;
			}
			console.log('Deleting old entries done.');
		});
	}
};
