const config = require('openmrs/default-rspack-config');

// esm-patient-common-lib is published as TypeScript source. Transpile it while
// continuing to exclude all other dependencies from the application SWC rule.
config.scriptRuleConfig.exclude = /node_modules\/(?!@openmrs\/esm-patient-common-lib)/;

// The default config serves `dist/` as a static directory with a file watcher.
// With lazy compilation every lazily-requested chunk is emitted into `dist/`,
// which trips the watcher and makes webpack-dev-server force a full page
// reload (e.g. clicking "Order basket" reloaded the whole chart in dev).
// The dev middleware already serves everything from memory, so the static
// directory is redundant — disable it.
config.devServer.static = false;

module.exports = config;
