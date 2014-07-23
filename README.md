# Algolia Webcrawler

Simple node worker that crawls sitemaps in order to keep an [Algolia](https://www.algolia.com/) index up-to-date.

It uses simple CSS selectors in order to find the actual text content to index.

This app uses [Algolia's node library](https://github.com/algolia/algoliasearch-client-node).

## Usage

This script should be run via crontab in order to crawl the entire website at regular interval.

### Pre-requesites

1. Having at least one valid [sitemap.xml](http://robots-txt.com/sitemaps/) 
url that contains all the url you want to be indexed.
2. The sitemap(s) must contain at least the `<loc>` node, i.e. `urlset/url/loc`.

### Installation

1. Get the latest version
	- ssh+git: `git clone git@github.com:DeuxHuitHuit/algolia-webcrawler.git`
	- https: download the [latest tarball](https://github.com/DeuxHuitHuit/algolia-webcrawler/releases)
2. configure a [config.json](#configuration-file) file

### Running

cd to the root of the project and run
`node app`.

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

#### indexname: String

Your index name.

#### sitemaps: Array<Sitemap>

This array should contain a list of sitemap objects.

A sitemap is a really simple object with two String properties: url and lang. The 'url' property
is the exact url for this sitemap. The 'lang' property should explicit the main language used
by url found in the sitemap.

#### http: Object

An object containing different http options.

#### http.auth: String

The auth string. If you do not need auth, please specify an empty String.

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


### LICENSE

[MIT](http://deuxhuithuit.mit-license.org)    
Made with love in Montréal by [Deux Huit Huit](http://deuxhuithuit.com)    
Copyrights (c) 2014
