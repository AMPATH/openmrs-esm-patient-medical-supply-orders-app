const config = require('openmrs/default-webpack-config');

// @openmrs/esm-patient-common-lib (and other @openmrs/* packages) ship raw
// TypeScript source with no compiled dist, so they need to go through the
// script loader too instead of being excluded like other node_modules.
config.scriptRuleConfig.exclude = /node_modules\/(?!@openmrs)/;

module.exports = config;
