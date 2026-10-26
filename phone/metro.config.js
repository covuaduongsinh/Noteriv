const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Shared with web and desktop: the i18n catalogs (lib/core-plugins.ts imports them) and @noteriv/core's
// platform-neutral logic (the `@noteriv/core/*` alias in tsconfig.json).
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../packages/ui/src/i18n/locales'),
  path.resolve(__dirname, '../packages/core/src'),
];

module.exports = config;
