# Algolia Webcrawler ![David DM](https://david-dm.org/DeuxHuitHuit/algolia-webcrawler.png)

> Version 0.0.4

Simple node worker that crawls sitemaps in order to keep an [Algolia](https://www.algolia.com/) index up-to-date.

It uses simple CSS selectors in order to find the actual text content to index.

This app uses [Algolia's node library](https://github.com/algolia/algoliasearch-client-node).

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
4. An Algolia Credential that can create objects and set settings on the index.

### Installation

#### 1. Get the latest version

#### npm

```
npm i algolia-webcrawler -g
```

##### git

- ssh+git: `git clone git@github.com:DeuxHuitHuit/algolia-webcrawler.git`
- https: `git clone https://github.com/DeuxHuitHuit/algolia-webcrawler.git`

##### https
- download the [latest tarball](https://github.com/DeuxHuitHuit/algolia-webcrawler/releases)

#### 2. create a [config.json](#configuration-file) file

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

**All options are required.** No defaults are provided.

#### app: String

The name of your app.

#### cred: Object

Algolia crendentials object. See 'cred.appid' and 'cred.apikey'.

#### cred.appid: String

Your Algolia App ID.

#### cred.apikey: String

Your generated Algolia API key.

#### oldentries: Integer

The maximum number of seconds an entry can live without being updated. After
each run, the app will search for old entries and delete them. If you do not
wish to get rid of old entries, set this value to 0.

#### index: Object

An object containing various values related to your index.

#### index.name: String

Your index name.

#### index.settings: Object

An object that will act as argument to Algolia's `Index#setSetting` method.

Please read [Algolia's documentation on that subject](https://github.com/algolia/algoliasearch-client-node#index-settings).
Any valid attribute documented for this method can be used.

#### index.settings.attributesToIndex: Array<String>

An array of string that defines which attributes are indexable,
which means that full text search will be performed against them.
For a complete list of possible attributes see the [Stored Object](#stored-object) section.

#### index.settings.attributesForFaceting: Array<String>

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

#### http.auth: String

The auth string, in node's `username:password` form.
If you do not need auth, you still need to specify an empty String.

#### selectors: Object

An object containing CSS selectors in order to find the content in the pages html.

#### selectors.title: String

CSS selector for the title of the page.

#### selectors.description: String

CSS selector for the description of the page.

#### selectors.image: String

CSS selector for the image of the page.

#### selectors.text: String

CSS selector for the title of the page.

#### formatters: Object

An object containing formatter string. Their values are removed from the original result obtained
with the associated CSS selector.

#### formatters.title: String

The string to remove from the title of the page.


### Stored Object

The stored object on Algolia's server is as follows

````js
{
	date: new Date(),
	url: 'http://...',
	objectID: shasum.digest('base64'),
	lang: sitemap.lang,
	title: '',
	description: '',
	image: '',
	text: ['...']
}
````

One thing to notice is that text is an array, since we tried to preserve the original text
node -> actual value relationship. Algolia handle this just fine.

### Indexing

Indexing is done automatically, at each run. To tweak how indexing works, please see the
[index.settings](#indexsettings-object) configuration option.

### LICENSE

[MIT](http://deuxhuithuit.mit-license.org)    
Made with love in Montréal by [Deux Huit Huit](http://deuxhuithuit.com)    
Copyrights (c) 2014
