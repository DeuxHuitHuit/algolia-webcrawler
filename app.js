
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

var pages = client.initIndex(config.indexname);

console.log('Welcome to "%s" %s v%s', config.app, pack.name, pack.version);

sitemap(config, function (sitemap, urls) {
	var results = _.map(urls, function (url, index) {
		processOne(config, url, function (record) {
			pages.saveObject(record);
			console.log('Object %s:%s saved (%s)', record.objectID, record.lang, record.url);
		});
	});
	
	console.log('Sitemap %s registered %s / %s urls', sitemap.url, results.length, urls.length);
});

