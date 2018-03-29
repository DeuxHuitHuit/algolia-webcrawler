'use strict';

const _ = require('lodash');
const parse = require('../lib/process').parse;
const test = require('tape').test;

const now = new Date();
const config = {
	"selectors": [
		{key: "title", selector: "title"}
	],
	"types": {
		"json": "json"
	}
};

test('Simple parse', (t) => {
	const rec = {
		date: now,
		timestamp: now.getTime()
	};
	const c = _.clone(config);
	const data = `<html><head>
	<title>test</title>
<head></html>`;
	parse(rec, data, c);
	t.equal(rec.date, now);
	t.equal(rec.timestamp, now.getTime());
	t.equal(rec.title, 'test');
	t.end();
});

test('Custom selector parse', (t) => {
	const rec = {};
	const c = _.clone(config);
	const data = `<html>
	<a class="test">test</a>
	<a class="no-ok">not-ok</a>
</html>`;
	c.selectors.push({key: 'custom', selector: 'a.test'});
	parse(rec, data, c);
	t.equal(rec.custom, 'test');
	t.end();
});

test('Selector exclusion parse', (t) => {
	const rec = {};
	const c = _.clone(config);
	const data = `<html><body>
	<a>test</a>
	<footer><a class="no-ok">not-ok</a></footer>
</body></html>`;
	c.selectors.push({key: 'links', selector: 'a', exclude: 'footer'});
	parse(rec, data, c);
	t.equal(rec.links, 'test');
	t.end();
});

test('JSON formatter', (t) => {
	const rec = {};
	const c = _.clone(config);
	const data = `<html>
	<meta content='{"test":"1","tes2":0.4}'>
</html>`;
	c.selectors.push({key: 'json', selector: 'meta'});
	parse(rec, data, c);
	t.equal(rec.json.test, '1');
	t.equal(rec.json.tes2, 0.4);
	t.end();
});
