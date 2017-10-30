#!/usr/bin/env node

/**
 * App
 */

'use strict';

const argv = require('optimist').argv;
const pack = require('./package.json');
const path = require('path');
const fs = require('fs');
const u = require('url');
const _ = require('lodash');
const algoliasearch = require('algoliasearch');
const updateNotifier = require('update-notifier');

const processOne = require('./lib/process');
const sitemap = require('./lib/sitemap');
const dns = require('./lib/dns-cache');

let sitemapProcessed = 0;
let sitemapCount = 0;
let urlCount = 0;

const configFile = argv.config ? path.resolve(argv.config) : './config.json';
let config = {};
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

// Process map static selectors into their object equivalent
config.selectors = _.map(config.selectors, (selector, key) => {
	if (!_.isObject(selector)) {
		selector = {selector};
	}
	return {
		key,
		attributes: selector.attributes,
		selector: selector.selector
	};
});

const plugins = require('./lib/plugins')(__dirname, config.plugins);

const client = algoliasearch(config.cred.appid, config.cred.apikey);
const pages = client.initIndex(config.index.name);

// Welcome
console.log('Welcome to "%s" %s v%s', config.app, pack.name, pack.version);
console.log();
console.log('Loaded "%s" configuration', configFile);
console.log();

// Launch sitemap crawling
sitemap(config, (sitemap, urls) => {
	sitemapProcessed++;
	
	if (!urls.length) {
		console.log('Sitemap %s does not contain any urls', sitemap.url);
	}
	
	console.log('Parsing Sitemap %s', sitemap.url);
	
	const totalCount = urls.length;
	if (_.isArray(config.blacklist)) {
		urls = _.filter(urls, (url) => {
			return _.every(_.map(
				config.blacklist,
				(bl) => url.url !== bl && u.parse(url.url).path !== bl
			));
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
	
	const results = _.map(urls, (url, index) => {
		console.log('Registered ' + url.url);
		const processResults = processOne({
			config,
			url,
			index,
			plugins
		}, (error, record) => {
			if (!!error || !record) {
				console.error('Error! ' + error.message);
				if (!!error.pageNotFound && !!record) {
					pages.deleteObject(record.objectID, (error, result) => {
						console.log('Object ' + record.objectID + ' has been deleted');
					});
				}
				removeOldEntries();
				return;
			}
			
			pages.saveObject(record, (error, result) => {
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
	pages.setSettings(config.index.settings, (error, result) => {
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

const removeOldEntries = () => {
	urlCount++;
	if (urlCount === sitemapCount) {
		processOne.stop();
		if (_.isInteger(config.oldentries) && config.oldentries > 0) {
			console.log()
			console.log('Removing old entries...');
			pages.deleteBy({
				numericFilters: ['timestamp<' + (new Date().getTime() - config.oldentries)]
			}, (error, content) => {
				if (!!error) {
					console.error('Error deleting entries.');
					return;
				}
				console.log('Deleting old entries done.');
			});
		}
	}
};
