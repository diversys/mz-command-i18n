var inquirer = require('inquirer'),
    path = require('path'),
    colors = require('colors'),
    _ = require('lodash'),
    fs = require('fs');
var emptyDir = require('empty-dir');
var Util = require('./util');

var IGNORE_SOURCE_DIRS = ['i18n-php-server'];
var allVersion = [];


var i18nFilePath = '_i18n.json';
var fisConfPath = 'fis-conf.js';
var commonPhpPath = 'test/common.php';

var parentPath = process.cwd().split('/').slice(0, -1).join('/'),
    currentPath = process.cwd(),
    currentDirName = currentPath.split('/').slice(-1)[0];


var Init = function(){  
    if (!/source.[\w\-]+$/.test(currentPath)) {
        fis.log.warn('请先创建新国家文件夹并进入操作!'); return;
    }
    if (emptyDir.sync('.')) {
        askToInit();
    } else {
        checkContinue(function(){
            askToInit();  
        });
    }
};


var askToInit = function(){
    allVersion = fs.readdirSync('..').filter(function(path) {
        return (fs.lstatSync('../' + path).isDirectory() && 
                IGNORE_SOURCE_DIRS.indexOf(path) < 0 &&
                currentDirName !== path);
    });
    ask();
};


var checkContinue = function(cb){
    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '你这个文件夹不是空的哦，覆盖吗?'
    }], function(answers){
        if ( answers.confirm ) {
            cb();
        } else {
            console.log('Bye~');
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
            message: '你想从那个国家同步?',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else if ( allVersion.indexOf(value.trim()) < 0 ) {
                    return '没有这个国家';
                } else {
                    return true; 
                }
            }
        },
        {
            type: 'input',
            name: 'urlprefix',
            message: '请输入 urlprefix (e.x www.meizu.com/en -> en)?',
            filter: function(value){
                if ( /^\//.test(value) ) {
                    return value.trim();
                } else {
                    return '/' + value.trim();
                }
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }, {
            type: 'input',
            name: 'lang',
            message: '请输入语言国家码 (e.x zh-CN)?',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }, {
            type: 'input',
            name: 'namespace',
            message: '请输入命名空间（通常和目录名一致）',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }
    ];
    
    inquirer.prompt(questions, function( answers ) {
        var targetPath = parentPath + '/' + answers.originName;
        var toWriteAnswers = _.clone(answers, true);
        var includes = [
            'components/**',

            // page
            'page/_partial/**',
            'page/products',

            '**/about.*',
            '**/contact.*',
            '**/error.*',
            '**/index.*',
            '**/landing.*',
            '**/legal.*',
            '**/not_found.*',
            '**/server_busy.*',

            // static
            'static/products',
            'static/_partial/**',
            'static/global/**',
            'static/index/**',
            'static/lib/**',

            // test
            'test/*',
            'test/page/_partial/**',
            'static/products',

            // widget
            'widget/**',
            '/*'

        ];

        fis.log.info('稍等，初始化中...');
        fis.util.copy(targetPath, currentPath, includes, null);

        // lang
        fis.util.write(`lang/${answers.lang}.po`, '');

        // fis-conf
        fis.util.copy(targetPath + '/' + fisConfPath, currentPath + '/' + fisConfPath, null, null);
        rewriteFisConf(answers);

        // common.php
        var commonText = fs.readFileSync(commonPhpPath, 'utf-8');

        fs.writeFileSync(
            commonPhpPath, 
            commonText
                .replace(
                    /([\'\"])i18n[\'\"]\s*\=>\s*[\'\"]\w+[\'\"]\,/,
                    '$1i18n$1 => $1' + answers.lang + '$1,'
                    )
                .replace(new RegExp('/' + answers.originName + '/', 'g'), answers.urlprefix + '/')
        );

        // i18n
        fs.writeFileSync(i18nFilePath, JSON.stringify(toWriteAnswers, null, "  ") );
        fis.log.info('恭喜，初始化完成');
    });
};

var rewriteFisConf = function(answers){
    var oldContent = fs.readFileSync(fisConfPath, 'utf-8');
    var newContent = oldContent;
    newContent = newContent.replace(/([\'\"]namespace[\'\"]\s*,\s*[\'\"])[\w\-]*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.namespace + $2;
    });
    
    newContent = newContent.replace(/([\'\"]urlprefix[\'\"]\s*,\s*[\'\"])[\w\-\/]*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.urlprefix + $2;
    });
    
    newContent = newContent.replace(/([\'\"]lang[\'\"]\s*,\s*[\'\"])[\w\-]*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.lang + $2;
    });
    
    fs.writeFileSync(fisConfPath, newContent);
};


module.exports = Init;