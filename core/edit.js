var fs = require('fs');

var config = require('../config');

module.exports = function(){
  if ( fs.existsSync(config.i18nFile) ) {
    require('child_process').spawn('vim', [config.i18nFile], {stdio: 'inherit'});
    fis.log.info('打开编辑器之神ING');
  } else {
    fis.log.error('没有配置文件撒，走错地方了骚年！');
  }
};
