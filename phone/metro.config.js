const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Shared with web and desktop: the i18n module and catalogs (`@noteriv/ui/i18n`, lib/i18n.ts) and @noteriv/core's
// platform-neutral logic (`@noteriv/core/*`); the aliases are in tsconfig.json. Neither imports a package, so
// nothing resolves to the web's React.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../packages/ui/src/i18n'),
  path.resolve(__dirname, '../packages/core/src'),
];

module.exports = config;
