var path = require('path'),
    syspath = require('path'),
    globToRegExp = require('glob-to-regexp'),
    walk = require('walk'),
    fs = require('fs');

var fse = require('fs-extra');

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


var copy = function(source, targets, p){
    
    var stat = fs.statSync(source);
    
    if( stat.isDirectory() ){
        fs.readdir(source, function(err, paths){
            paths.forEach(function(path){
                if( path !== '.' && path !== '..' ){
                    copy(source + '/' + path, targets, syspath.join(p || '', path));
                }
            });
        });
    } else if( stat.isFile() ){
        fs.readFile(source, function(err, data){
            if( err ){
                throw err;
            }
            targets.forEach(function(target){

                var tpath = syspath.join(target.path, p);
                if( target.excludeRegs.every(function(e){
                    return !e.test(tpath);
                }) ){

                    var ppath = R.dropLast(1, tpath.split('/')).join('/');


                    fse.ensureDir(ppath, function(err){
                        if( err ){
                            throw err;
                        }
                        console.log(tpath);
                        fs.writeFile(tpath, data, function(err){
                            if( err ){
                                throw err;
                            }
                        });
                    });
                    

                }
            });
            
        });
    }
};

var Syncl = function(args) {

    if( !/source$/.test(parentPath) ){
        fis.log.warn('请进入语言路径进行操作!');
        process.exit(0);
    }
    
    fis.log.info('开始同步了骚年！');
    console.log();
    
    
    var i18nConfig;
    var commonConfig;
    try {
        i18nConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_NAME));
        commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    } catch (error) {
        console.log('读取配置文件失败');
        process.exit();
    }

    var currentLanVersion = R.last(path.resolve('.').split('/')),
        currentPath = path.resolve('.');

    if( i18nConfig.syncDir.exclude.indexOf(currentLanVersion) < 0 ){
        i18nConfig.syncDir.exclude.push(currentLanVersion);
    }

    
    var paths = fs.readdirSync('..').filter(function(path){
        return fs.lstatSync('../' + path).isDirectory();
    }).filter(function(path){
        return IGNORE_SOURCE_DIRS.indexOf(path) < 0;
    });

    var products = commonConfig.product;

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
                exclude = R.concat(commonRule.exclude, spec.exclude);
            } else {
                exclude = commonConfig.rule['default'].exclude;
            }
            
            var excludeRegs = exclude.map(function(e){
                return globToRegExp(syspath.join(syspath.resolve('.'), e));
            });

            
            fis.util.copy(syspath.resolve('.'), syspath.join('../', path), null, excludeRegs);
        });

        
        
    } else if( args.length === 1 ){


        var command = args[0];

        if( paths.indexOf(command) ){
            var exclude;
            if( i18nConfig.specRule[command] ){
                var spec = i18nConfig.specRule[command];
                var commonRule = commonConfig.rule[spec['useCommonRule']];
                if( !commonConfig ){
                    fis.log.error('你用哪个 CommonRule ?');
                    process.exit();
                }
                exclude = R.concat(commonRule.exclude, spec.exclude);
            } else {
                exclude = commonConfig.rule['default'].exclude;
            }
            var excludeRegs = exclude.map(function(e){
                return globToRegExp(syspath.join(currentPath, e));
            });
            
            fis.util.copy(syspath.resolve('.'), syspath.join('../', command), null, excludeRegs);
        }
        
        if( Object.keys(products).indexOf(command) >= 0 ){
            
            paths.filter(function(path){
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
                    exclude = R.concat(commonRule.exclude, spec.exclude);
                } else {
                    exclude = commonConfig.rule['default'].exclude;
                }
                
                var excludeRegs = exclude.map(function(e){
                    return globToRegExp(syspath.join(syspath.resolve('.'), e));
                });


                var includeRegs = products[command].map(function(e){
                    return globToRegExp(syspath.join(syspath.resolve('.'), e));
                });
                
                fis.util.copy(syspath.resolve('.'), syspath.join('../', path), includeRegs, excludeRegs);
            });
            
        }
        
    } else if( args.length === 2 ){
        
        var language = args[0],
            productName = args[1];

        var includeRegs = products[productName].map(function(e){
            return globToRegExp(syspath.join(syspath.resolve('.'), e));
        });

        fis.util.copy(syspath.resolve('.'), syspath.join('../', language), includeRegs, null);
        
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
