var i18nFile = '_i18n.json';

module.exports = {
  i18nFile: i18nFile,
  frameworkConfigFile: 'fis-conf.js',
  defaultExclude: [
    '/' + i18nFile,
    '*.custom.*',
    '/fis-conf.js',
    '/server.conf',
    '/lang/*'
  ],
  defaultInclude: [
    '*'
  ],
  syncsDirs: [
    '/page/*',
    '/test/*',
    '/widget/*'
  ],
  needMappingDirs: [
    '/page/products'
  ],
  syncsDomain: 'm.meizu.com'
};
