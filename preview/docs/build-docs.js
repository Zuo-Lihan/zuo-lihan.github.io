#!/usr/bin/env node
const shared = require('../../docs/build-docs');
const buildDocs = () => shared.buildDocs({docsRoot: __dirname});
if (require.main === module) buildDocs();
module.exports = {...shared, buildDocs};
