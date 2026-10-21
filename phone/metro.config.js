const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The i18n catalogs are shared with web and desktop (lib/core-plugins.ts imports them).
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../packages/ui/src/i18n/locales'),
];

module.exports = config;
