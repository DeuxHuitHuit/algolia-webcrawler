# Algolia Webcrawler

Simple node worker that crawls sitemaps in order to keep an [Algolia](https://www.algolia.com/) index up-to-date.

## Usage

### Pre-requesites

1. Having at least one valid sitemap.xml url that contains all the url you want to be indexed.
2. The sitemaps must contain at least the `<loc>` node.

### Installation

1. via git: `git clone git@github.com:DeuxHuitHuit/algolia-webcrawler.git`
2. download the [latest tarball](https://github.com/DeuxHuitHuit/algolia-webcrawler/releases)

### Running

cd to the root of the project and run
`node app`.

### Configuration

Configuration is done via the
[config.json](https://github.com/DeuxHuitHuit/algolia-webcrawler/blob/master/config.json) file.

You can choose a config.json file stored elsewhere usign the --config flag.

`node app --config my-config.json`

### LICENSE

[MIT](http://deuxhuithuit.mit-license.org)    
Copyrights (c) 2014 [Deux Huit Huit](http://deuxhuithuit.com)
