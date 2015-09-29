var inquirer = require('inquirer'),
    path = require('path'),
    colors = require('colors'),
    _ = require('lodash'),
    fs = require('fs');

const emptyDir = require('empty-dir');

var Util = require('./util'),
    Syncl = require('./syncl');

var allVersion = [];


var parentPath = process.cwd().split('/').slice(0, -1).join('/'),
    currentPath = process.cwd(),
    currentDirName = currentPath.split('/').slice(-1)[0];
var config = require('../config');

var Init = function(config){
    if ( checkThisEmpty() ) {
        askToInit();
    } else {
        checkContinue(function(){
            askToInit();  
        });
    }
};


var askToInit = function(){
    getAllVersion();
    ask();
};

var checkThisEmpty = function(){
    return emptyDir.sync('.');
};

var checkContinue = function(cb){
    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '你这个文件夹不是空的哦，覆盖吗骚年?'
    }], function(answers){
        if ( answers.confirm ) {
            cb();
        } else {
            console.log('呵呵');
        }
    });
};

var getAllVersion = function(){
    var parentPath = process.cwd().split('/').slice(0, -1).join('/');
    var filesname = fs.readdirSync(parentPath);
    //TODO: there has a bug( noknown undefined );
    allVersion = filterFile(filesname, parentPath);
};

//return dirs
var filterFile = function(files, path) {
  return files.map(function(name){
    if (fs.lstatSync(path + '/' + name).isDirectory()) {
      return name;
    } 
  });
};

var ask = function(){
  //not remove
  console.log();  
  var answers = {};
  var needMapping = function(){
    return  function(){
      
    };
  };
  var questions = [
    {
      type: 'input',
      name: 'originName',
        message: 'what version you want to merge?',
        filter: function(value){
            return value.trim();
        },
      validate: function(value){
        if ( value.trim() === '' || value === null ) {
          return '你有输入吗？啊!';
        } else if ( allVersion.indexOf(value.trim()) < 0 ) {
          return '找不到撒，是不是走错地方了？!';
        } else {
          return true; 
        }
      }
    },
    {
      type: 'input',
      name: 'urlprefix',
      message: 'what is urlprex?',
      filter: function(value){
        if ( /^\//.test(value) ) {
          return value.trim();
        } else {
          return '/' + value.trim();
        }
      },
      validate: function(value){
        if ( value.trim() === '' || value === null ) {
          return '输入一下呗！';
        } else {
          return true; 
        }
      }
    }, {
      type: 'input',
      name: 'lang',
        message: 'what is lang? (e.x zh-CN)?',
        filter: function(value){
            return value.trim();
        },
      validate: function(value){
        if ( value.trim() === '' || value === null ) {
          return '手抖了？';
        } else {
          return true; 
        }
      }
    }, {
      type: 'input',
      name: 'namespace',
        message: 'what is namespace?',
        filter: function(value){
            return value.trim();
        },
        validate: function(value){
        if ( value.trim() === '' || value === null ) {
          return '嗯？';
        } else {
          return true; 
        }
      }
    }, {
      type: 'confirm',
      name: 'needMapping',
      message: '机智如我发现了 ' + config.needMappingDirs + '  里的路径可能需要mapping？'
    }
  ];
  
  inquirer.prompt(questions, function( answers ) {
    var targetPath = parentPath + '/' + answers.originName;
    
    merge(targetPath);
      replace(answers);

    answers.include = config.defaultInclude;
    answers.exclude = config.defaultExclude;

    var toWriteAnswers = _.clone(answers, true);
    delete toWriteAnswers.needMapping;
    
    //fs.writeFileSync(config.i18nFile, JSON.stringify(toWriteAnswers, null, "  ") );

    if ( answers.needMapping ) {
      var mappingQuestions = [];
      config.needMappingDirs.map(function(dir){
        fs.readdirSync('../' + answers.originName + '/' + dir).map(function(subdir){
          mappingQuestions.push({
            type: 'input',
            name: dir.split('/').join('.').slice(1) + '.' + subdir,
            message: 'Okeydokey，[ ' + subdir.green  + ' ] mapping to?',
              filter: function(value){
                  value = value.trim();
                  if(!value || value === '') {
                      return subdir;
                  } else {
                      return value; 
                  }
              },
              validate: function(value){
              if(value.length === 1) {
                return '一个字符？你在逗我？';
              } else {
                return true;
              }
            }
          });
        });
      });
      inquirer.prompt(mappingQuestions, function( mappingAnswers ) {

        //var i18nconfig = JSON.parse(fs.readFileSync(config.i18nFile, 'utf-8'));
        
        toWriteAnswers.mapping = {};
        
        Object.keys(mappingAnswers).map(function(starPath){
          var prefix = starPath.split('.').slice(0, -1).join('/');
          var oldPath = starPath.split('.').join('/');
          // if ( !(starPath.split('.').slice(-1)[0] === mappingAnswers[starPath]) ) {
          //   fis.util.copy(oldPath, path.join(prefix, mappingAnswers[starPath]));          
          //   fis.util.del(oldPath);
          // }
          toWriteAnswers.mapping[oldPath] = prefix + '/' + mappingAnswers[starPath];
        });
        
        fs.writeFileSync(config.i18nFile, JSON.stringify(toWriteAnswers, null, "  ") );

        var extraCopyFiles = [
          '/lang'
        ];

        extraCopyFiles.map(function(file){
          fis.util.copy(parentPath + '/' + toWriteAnswers.originName + file,
                       currentPath + file);
        });
        if ( toWriteAnswers.originName !== currentDirName ) {
          Syncl();  
        }
      });
    } else {
      fs.writeFileSync(config.i18nFile, JSON.stringify(toWriteAnswers, null, "  ") );
      if ( toWriteAnswers.originName !== currentDirName ) {
        Syncl();  
      }
    }
  });
};

var replace = function(answers){
  var oldContent = fs.readFileSync(config.frameworkConfigFile, 'utf-8');
  var newContent = oldContent;
  newContent = newContent.replace(/([\'\"]namespace[\'\"]\s*,\s*[\'\"])\w*([\'\"])/g, function($0, $1, $2){
    return $1 + answers.namespace + $2;
  });
  
  newContent = newContent.replace(/([\'\"]urlprefix[\'\"]\s*,\s*[\'\"])\w*([\'\"])/g, function($0, $1, $2){
    return $1 + answers.urlprefix + $2;
  });
  
  newContent = newContent.replace(/([\'\"]lang[\'\"]\s*,\s*[\'\"])[\w-]*([\'\"])/g, function($0, $1, $2){
    return $1 + answers.lang + $2;
  });
  
  fs.writeFileSync(config.frameworkConfigFile, newContent);
};

var merge = function(targetPath){  
  var currentPath = process.cwd();
  var copyFiles = [
    'fis-conf.js',
  ];
  copyFiles.map(function(file){
    fis.util.copy(targetPath + '/' + file, currentPath + '/' + file, null, null);
  });
};

module.exports = Init;
