'use strict';

const _ = require('lodash');
const process = require('../lib/process');
const test = require('tape').test;
const config = {
	"maxRecordSize": 100
};

test('maxRecordSize', (t) => {
	const rec = {
		text: (new Array(100).fill('aaaaaaaaaa'))
	};
	t.equal(rec.text.length, 100);
	const c = _.clone(config);
	process.trimmer(rec, c);
	t.equal(rec.text.length, 6);
	t.end();
});