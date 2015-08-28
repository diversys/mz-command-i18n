var inquirer = require('inquirer'),
    path = require('path'),
    colors = require('colors'),
    _ = require('lodash'),
    fs = require('fs');

const emptyDir = require('empty-dir');

var Util = require('./util');

var allVersion = [];

//var needMappingDirs = [];

var parentPath = process.cwd().split('/').slice(0, -1).join('/');

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
      message: '你要选哪个版本作为原始版本?',
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
      message: 'urlprex是啥?',
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
      message: '语言变量名是啥，举个栗子zh-CN?',
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
      message: '请告诉我命名空间（namespace）！',
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
    
    fs.writeFileSync(config.i18nFile, JSON.stringify(answers, null, "  ") );

    if ( answers.needMapping ) {
      var mappingQuestions = [];
      config.needMappingDirs.map(function(dir){
        fs.readdirSync('../' + answers.originName + '/' + dir).map(function(subdir){
          mappingQuestions.push({
            type: 'input',
            name: dir.split('/').join('.').slice(1) + '.' + subdir,
            message: 'Okeydokey，这个原始目录[ ' + subdir.green  + ' ]你想mapping成啥样？((留空则不mapping哦！))',
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

        var i18nconfig = JSON.parse(fs.readFileSync(config.i18nFile, 'utf-8'));
        console.log("i18nconfig = ", i18nconfig);
        
        i18nconfig.mapping = {};
        
        Object.keys(mappingAnswers).map(function(starPath){
          var prefix = starPath.split('.').slice(0, -1).join('/');
          var oldPath = starPath.split('.').join('/');
          if ( ! (starPath.split('.').slice(-1)[0] === mappingAnswers[starPath] ) ) {
            fis.util.copy(oldPath, path.join(prefix, mappingAnswers[starPath]));          
            fis.util.del(oldPath);
          }
          i18nconfig.mapping[oldPath] = prefix + mappingAnswers[starPath];
        });
        
        fs.writeFileSync(config.i18nFile, JSON.stringify(i18nconfig, null, "  ") );
      });
    }
  });
};

var replace = function(answers){
  
  var oldContent = fs.readFileSync('./fis-conf.js', 'utf-8');
  
  var nsreg = new RegExp('\'namespace\',\\s{0,1}\'.*\'');
  var nsreg2 = new RegExp('"namespace",\\s{0,1}".*"');
  
  var upreg = new RegExp('\'urlprefix\',\\s{0,1}\'.*\'');
  var upreg2 = new RegExp('"urlprefix",\\s{0,1}".*"');

  var i18nreg = new RegExp('\'i18n\',\\s{0,1}\'.*\'');
  var i18nreg2 = new RegExp('"i18n",\\s{0,1}".*"');
  
  var newContent = oldContent;
  newContent = newContent.replace(nsreg, '\'namespace\', \'' + answers.namespace + '\'');
  newContent = newContent.replace(nsreg2, '\'namespace\', \'' + answers.namespace + '\'');
  
  newContent = newContent.replace(upreg, '\'urlprefix\', \'' + answers.urlprefix + '\'');
  newContent = newContent.replace(upreg2, '\'urlprefix\', \'' + answers.urlprefix + '\'');

  newContent = newContent.replace(i18nreg, '\'i18n\', \'' + answers.lang + '\'');
  newContent = newContent.replace(i18nreg2, '\'i18n\', \'' + answers.lang + '\'');

  fs.writeFileSync('./fis-conf.js', newContent);
};


var makeReg = function(regStings){
  var regArr = [];
  regStings.forEach(function(regS){
    regArr.push( new RegExp(regS));
  });
  return regArr;
};


var merge = function(targetPath){  
  var currentPath = process.cwd();
  fis.util.copy(targetPath, currentPath, null, null);
};



module.exports = Init;