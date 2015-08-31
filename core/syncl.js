var path = require('path'),
    globToRegExp = require('glob-to-regexp'),
    fs = require('fs');

var Util = require('./util');

var config = require('../config');


var parentPath = process.cwd().split('/').slice(0, -1).join('/');

var Syncl = function() {
  fis.log.info('开始同步了骚年！');
  console.log();
  
  var stopProcess = processX();
  
  var i18nConfig;
  try {
    i18nConfig = JSON.parse(fs.readFileSync(config.i18nFile));  
  } catch(error) {
    fis.log.error('谁？谁动了我的配置文件？');
  }
  
  var originPath = parentPath + '/' + i18nConfig.originName;
  var currentPath = process.cwd();
  
  var includeRegs = i18nConfig.include.map(function(regs){
    return globToRegExp(originPath + regs);
  });

  var excludeRegs = i18nConfig.exclude.map(function(regs){
    return globToRegExp(originPath + regs);
  });
  
  var copyMapping = function(){
    if ( i18nConfig.mapping ) {
      Object.keys(i18nConfig.mapping).map(function(excludeRegstr){
        excludeRegs.push(globToRegExp(originPath + '/' + excludeRegstr + '/*'));
      });
      return function(){
        Object.keys(i18nConfig.mapping).map(function(excludeRegs){
          fis.util.copy(originPath + '/' + excludeRegs,
                        currentPath + '/' + i18nConfig.mapping[excludeRegs]);
          
        });
      };
    } else {
      return function(){};
    }
  }();
  
  fis.util.copy(originPath, currentPath, includeRegs, excludeRegs);
  
  copyMapping();
  
  
  setTimeout(function(){
    stopProcess();
    console.log();
    fis.log.info('完成了骚年！');  
  }, 100);  
};

var processX = function(){
  var conti = true;
  var printProgress = function(){
    process.stdout.write('.');
    setTimeout(function(){
      if ( conti ) {
        printProgress();  
      }
    }, 5);
  };
  printProgress();
  return function(){
    conti = false;
  };
};

module.exports = Syncl;
