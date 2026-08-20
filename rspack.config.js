const config = require('openmrs/default-rspack-config');

// esm-patient-common-lib is published as TypeScript source. Transpile it while
// continuing to exclude all other dependencies from the application SWC rule.
config.scriptRuleConfig.exclude = /node_modules\/(?!@openmrs\/esm-patient-common-lib)/;

module.exports = config;
