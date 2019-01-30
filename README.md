# Algolia Webcrawler

[![npm version](https://badge.fury.io/js/algolia-webcrawler.svg)](http://badge.fury.io/js/algolia-webcrawler)
[![Build Status](https://travis-ci.org/DeuxHuitHuit/algolia-webcrawler.svg)](https://travis-ci.org/DeuxHuitHuit/algolia-webcrawler)
![Build Status](https://ci.appveyor.com/api/projects/status/2xjk6u9u1jruswfw?svg=true)
[![Greenkeeper badge](https://badges.greenkeeper.io/DeuxHuitHuit/algolia-webcrawler.svg)](https://greenkeeper.io/)
[![David DM](https://david-dm.org/DeuxHuitHuit/algolia-webcrawler/status.svg?style=flat)](https://david-dm.org/DeuxHuitHuit/algolia-webcrawler/)
[![Maintainability](https://api.codeclimate.com/v1/badges/ee40fe13f5462b7c90d7/maintainability)](https://codeclimate.com/github/DeuxHuitHuit/algolia-webcrawler/maintainability)
[![Known Vulnerabilities](https://snyk.io/test/github/deuxhuithuit/algolia-webcrawler/badge.svg?targetFile=package.json)](https://snyk.io/test/github/deuxhuithuit/algolia-webcrawler?targetFile=package.json)

Simple node worker that crawls sitemaps in order to keep an [Algolia](https://www.algolia.com/) index up-to-date.

It uses simple CSS selectors in order to find the actual text content to index.

This app uses [Algolia's library](https://github.com/algolia/algoliasearch-client-js).

## TL;DR

1. [Usage](#usage)
2. [Pre-requesites](#pre-requesites)
3. [Installation](#installation)
4. [Running](#running)
5. [Configuration file](#configuration-file)
6. [Configuration options](#configuration-options)
7. [Stored Object](#stored-object)
8. [Indexing](#indexing)
9. [License](#license)

## Usage

This script should be run via crontab in order to crawl the entire website at regular interval.

### Pre-requesites

1. Having at least one valid [sitemap.xml](http://robots-txt.com/sitemaps/) 
url that contains all the url you want to be indexed.
2. The sitemap(s) must contain at least the `<loc>` node, i.e. `urlset/url/loc`.
3. An empty Algolia index.
4. An Algolia Credential that can create objects and set settings on the index, i.e.
search, addObject, settings, browse, deleteObject, editSettings, deleteIndex

### Installation

1. Get the latest version
	- **npm** `npm i algolia-webcrawler -g`
	- **git**
		- ssh+git: `git clone git@github.com:DeuxHuitHuit/algolia-webcrawler.git`
		- https: `git clone https://github.com/DeuxHuitHuit/algolia-webcrawler.git`
	- **https** download the [latest tarball](https://github.com/DeuxHuitHuit/algolia-webcrawler/releases)
2. create a [config.json](#configuration-file) file

### Running

### npm
```
algolia-webcrawler --config config.json
```

### other
cd to the root of the project and run `node app`.

### Configuration file

Configuration is done via the
[config.json](https://github.com/DeuxHuitHuit/algolia-webcrawler/blob/master/config.json) file.

You can choose a config.json file stored elsewhere usign the --config flag.

`node app --config my-config.json`

### Configuration options

At the bare minimum, you can edit config.json to set a values to the following options: 
'app', 'cred', 'indexname' and at least one 'sitemap' object.
If you have multiple sitemaps, please list them all: 
sub-sitemaps will not be crawled.

**Most options are required.** No defaults are provided, unless stated otherwise.

#### app: String

The name of your app.

#### cred: Object

Algolia credentials object. See 'cred.appid' and 'cred.apikey'.

#### cred.appid: String

Your Algolia App ID.

#### cred.apikey: String

Your generated Algolia API key.

#### delayBetweenRequests: Integer

Simple delay between each requests made to the website in milliseconds.

#### oldentries: Integer

The maximum number of milliseconds an entry can live without being updated. After
each run, the app will search for old entries and delete them. If you do not
wish to get rid of old entries, set this value to 0.

#### oldentriesfilters: String

A filter string that will be applied when deleting old entries.
Useful when you want to keep old records that won't get updated.
Only records that are old and match the filter will be deleted.

#### maxRecordSize: Integer

The maximum size in bytes of a record to be sent to Algolia.
The default is 10,000 but could vary based on different plans.

#### attributesToPop: Array<String>

When the record is too big (based on maxRecordSize), the crawler will remove values from the text key.
Use this attribute to configure which keys should be pruned when the record is too big.

#### index: Object

An object containing various values related to your index.

##### index.name: String

Your index name.

##### index.settings: Object

An object that will act as argument to Algolia's `Index#setSetting` method.

Please read [Algolia's documentation on that subject](https://github.com/algolia/algoliasearch-client-js#index-settings).
Any valid attribute documented for this method can be used.

##### index.settings.attributesToIndex: Array<String>

An array of string that defines which attributes are indexable,
which means that full text search will be performed against them.
For a complete list of possible attributes see the [Stored Object](#stored-object) section.

##### index.settings.attributesForFaceting: Array<String>

An array of string that defines which attributes are filterable,
which means that you can use them to exclude some records from being returned.
For a complete list of possible attributes see the [Stored Object](#stored-object) section.

#### sitemaps: Array<Sitemap>

This array should contain a list of sitemap objects.

A sitemap is a really simple object with two String properties: url and lang. The 'url' property
is the exact url for this sitemap. The 'lang' property should explicit the main language used
by url found in the sitemap.

#### http: Object

An object containing different http options.

##### http.auth: String

The auth string, in node's `username:password` form.
If you do not need auth, you still need to specify an empty String.

#### selectors: Object

An object containing CSS selectors in order to find the content in the pages html.

##### selectors.title: String|Selector

CSS selector for the title of the page.

##### selectors.description: String|Selector

CSS selector for the description of the page.

##### selectors.image: String|Selector

CSS selector for the image of the page.

##### selectors.text: String|Selector

CSS selector for the title of the page.

##### selectors[key]: String|Selector

CSS selector for the "key" property. You can add custom keys as you wish.

#### Selector Object

Selectors can also be defined using the long form (i.e. as an object),
which allow specifying custom properties on it.

##### selectors[key].attributes: String|Array<String>

Name of the attributes to look for values. Default is ['content', 'value'].

##### selectors[key].selector: String

The actual CSS selector to use.

##### selectors[key].limit: Number

The maximum number of nodes to check.

#### exclusions: Object

An object containing CSS selectors to find elements that must not be indexed.
Those CSS selectors are matched for each node and are check against all their parents to make
sure non of its parent are excluded.

##### exclusions.text: String

CSS selector of excluded elements for the text of the page.

##### exclusions[key]: String

CSS selector of excluded elements for "key" property. The key must match the one used in selectors[key].

#### formatters: Object

An object containing formatter string. Their values are removed from the original result obtained
with the associated CSS selector.

##### formatters.title: String,Array

The string to remove from the title of the page. Can also be an array of strings.

##### formatters[key]: String,Array

The string to remove from the specified key. Can also be an array of strings.

#### types[key]: String

The parse function used to format the value. Supported types are "integer", "float", "boolean" and "json".

#### defaults[key]: String

The default value inserted for the specified key. Will be set if the value is falsy.

#### plugins: Array<String>

A list of javascript files to load custom code before saving the record. The only requirement is to
implement the following interface, where `record` is the object to be saved and data is the html.

```js
module.exports = (record, data) => {
	record.value_from_plugin = 'Yay!';
};
```

#### blacklist: Array<String>

All url are checked against all items in the blacklist.
If the complete url or its path component is in the blacklist, it won't get indexed.

### Stored Object

The stored object on Algolia's server is as follows

````js
{
	date: new Date(),
	url: 'http://...',
	objectID: shasum.digest('base64'),
	lang: sitemap.lang,
	http: {},
	title: '',
	description: '',
	image: '',
	text: ['...']
}
````

One thing to notice is that text is an array, since we tried to preserve the original text
node -> actual value relationship. Algolia handle this just fine.

### pingbackUrl

One url can be set to post a ping back to a web server after every saved url in Algolia.
The web server will receive a post with this information : 

````html
	result=[success|error]
	action=[update|delete]
	url=the url inserted
	last-modified=[the http header value]
	source=algolia-crawler
````

### Indexing

Indexing is done automatically, at each run. To tweak how indexing works, please see the
[index.settings](#indexsettings-object) configuration option.

### LICENSE

[MIT](http://deuxhuithuit.mit-license.org)    
Made with love in Montréal by [Deux Huit Huit](https://deuxhuithuit.com)    
Copyrights (c) 2014-2019
