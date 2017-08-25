#!/usr/bin/env node

/**
 * App
 */

'use strict';

var argv = require('optimist').argv;
var pack = require('./package.json');
var path = require('path');
var fs = require('fs');
var u = require('url');
var _ = require('lodash');
var algoliasearch = require('algoliasearch');
var updateNotifier = require('update-notifier');

var processOne = require('./lib/process');
var sitemap = require('./lib/sitemap');
var dns = require('./lib/dns-cache');
var sitemapProcessed = 0;
var sitemapCount = 0;
var urlCount = 0;

var configFile = argv.config ? path.resolve(argv.config) : './config.json';
var config = {};
try {
	config = require(configFile);
} catch (ex) {
	config = null;
}


const pkg = require('./package.json');
 
updateNotifier({pkg: pack}).notify();

if (!_.isObject(config)) {
	console.error('Invalid configuration');
	process.exit(1);
}
if (!_.isObject(config.cred)) {
	console.error('Invalid credentials');
	process.exit(2);
}
if (!_.isObject(config.index)) {
	console.error('Invalid index configuration');
	process.exit(4);
}
if (!_.isArray(config.sitemaps)) {
	console.error('Invalid sitemaps configuration');
	process.exit(8);
}

var client = algoliasearch(config.cred.appid, config.cred.apikey);
var pages = client.initIndex(config.index.name);

// Welcome
console.log('Welcome to "%s" %s v%s', config.app, pack.name, pack.version);
console.log();
console.log('Loaded "%s" configuration', configFile);
console.log();

// Launch sitemap crawling
sitemap(config, function (sitemap, urls) {
	sitemapProcessed++;
	
	if (!urls.length) {
		console.log('Sitemap %s does not contain any urls', sitemap.url);
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

	// All sitemaps have failed
	if (sitemapProcessed === config.sitemaps.length && sitemapCount === 0) {
		console.log('All Sitemaps do not contain any urls');
		process.exit(-1);
	} else if (!urls.length) {
		// Current sitemap failed, exit
		return;
	}
	
	var results = _.map(urls, function (url, index) {
		console.log('Registered ' + url.url);
		var processResults = processOne({
			config: config,
			url: url,
			index: index
		}, function (error, record) {
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
if (_.isObject(config.index.settings)) {
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
		} else {
			console.log('Configured index properly');
			console.log();
		}
	});
}

var removeOldEntries = function () {
	urlCount++;
	if (urlCount === sitemapCount) {
		processOne.stop();
		if (_.isInteger(config.oldentries) && config.oldentries > 0) {
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
	}
};
