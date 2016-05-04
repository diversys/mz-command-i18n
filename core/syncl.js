var path = require('path'),
    globToRegExp = require('glob-to-regexp'),
    walk = require('walk'),
    fs = require('fs');

var Util = require('./util');

var config = require('../config');

var testDir = 'test';

var syncTestErrN = 0,
    syncTestSucN = 0;

var parentPath = process.cwd().split('/').slice(0, -1).join('/');

var CONFIG_FILE_NAME = 'i18n.config.json';
var COMMON_CONGIG_FILE_PATH = '../../lib/mz-i18n-conf.json';

var IGNORE_SOURCE_DIRS = ['i18n-php-server'];

var R = require('fw-ramda');



var Syncl = function(args) {
    
    fis.log.info('开始同步了骚年！');
    console.log();
    
    var stopProcess = processX();
    
    //var i18nConfig;
    
    // try {
    //     i18nConfig = JSON.parse(fs.readFileSync(config.i18nFile));  
    // } catch(error) {
    //     fis.log.error('谁？谁动了我的配置文件？');
    // }
    
    
    var i18nConfig;
    var commonConfig;
    try {
        i18nConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_NAME));
        commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    } catch (error) {
        console.log('读取配置文件失败');
        process.exit();
    }

    var currentLanVersion = R.last(path.resolve('.').split('/'));

    if( i18nConfig.syncDir.exclude.indexOf(currentLanVersion) < 0 ){
        i18nConfig.syncDir.exclude.push(currentLanVersion);
    }

    
    var paths = fs.readdirSync('..').filter(function(path){
        return fs.lstatSync('../' + path).isDirectory();
    }).filter(function(path){
        return IGNORE_SOURCE_DIRS.indexOf(path) < 0;
    });

    var includeReg = globToRegExp(i18nConfig.syncDir.include);
    
    if( args.length === 0 ){
        
        var spaths = paths.filter(function(path){
            return includeReg.test(path);
        }).filter(function(path){
            return i18nConfig.syncDir.exclude.indexOf(path) < 0;
        }).map(function(path){

            var exclude;
            
            if( i18nConfig.specRule[path] ){
                var spec = i18nConfig.specRule[path];
                var commonRule = commonConfig.rule[spec['useCommonRule']];
                if( !commonConfig ){
                    fis.log.error('你用哪个 CommonRule ?');
                    process.exit();
                }
                exclude = R.merge(commonRule.exclude, spec.exclude);
            } else {
                exclude = commonConfig.rule['default'];
            }
            
            let excludeRegs = exclude.map(function(e){
                return globToRegExp(e);
            });

            fis.copy('.', '../' + path, null, excludeRegs);
        });
        
    } else if( args.length === 1 ){
        
        
        
    } else if( args.length === 2 ){
        
    } else {
        fis.log.error('参数不合法');
    }



    
    
    
    // var originPath = parentPath + '/' + i18nConfig.originName;
    // var currentPath = process.cwd();
    
    // var includeRegs = i18nConfig.include.map(function(regs){
    //     return globToRegExp(originPath + regs);
    // });
    
    // var excludeRegs = i18nConfig.exclude.map(function(regs){
    //     return globToRegExp(originPath + regs);
    // });
    
    // var copyMapping = function(){
    //     if ( i18nConfig.mapping ) {
    //         Object.keys(i18nConfig.mapping).map(function(excludeRegstr){
    //             excludeRegs.push(globToRegExp(originPath + '/' + excludeRegstr + '/*'));
    //         });
    //         return function(){
    //             Object.keys(i18nConfig.mapping).map(function(excludeRegs){
    //                 fis.util.copy(originPath + '/' + excludeRegs,
    //                               currentPath + '/' + i18nConfig.mapping[excludeRegs]);
                    
    //             });
    //         };
    //     } else {
    //         return function(){};
    //     }
    // }();
    
    // excludeRegs.push(globToRegExp(parentPath + '/' + testDir));
    
    // fis.util.copy(originPath, currentPath, includeRegs, excludeRegs);
    
    // copyMapping();
    // copyTest(originPath, i18nConfig.namespace, function(){
    //     setTimeout(function(){
    //         stopProcess();
    //         console.log();
    //         fis.log.info('完成了骚年！');  
    //     }, 100);  
    // });
    
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

var copyTest= function(originPath, namespace, cb){
    var walker = walk.walk(originPath + '/' + testDir, { followLinks: false });
    var reg = new RegExp('=>(\\s\'\/)(.*\/)(\'\.)', 'g');
    var currentPath = process.cwd();
    walker.on("file", function(root, fileStat, next){
        fs.readFile(path.resolve(root, fileStat.name), 'utf-8', function (err, data) {
            syncTestSucN++;
            var relativePath = root.split(originPath)[1];
            var currentFile = '.' + relativePath + '/' + fileStat.name;
            var newContent = data.replace(reg, function($0 ,$1, $2, $3){
                return $1 + namespace + '/' + $2 + $3;
            });
            fs.writeFile(currentFile, newContent, function(){});
            next();
        });
    });
    walker.on("errors", function(root, nodeStatsArray, next){
        syncTestErrN++;
        next();
    }); // plural
    walker.on("end", function(){
        cb();
    });
};

module.exports = Syncl;
