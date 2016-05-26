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

var removeItems = function(list, items){
    var newList = Array.prototype.slice(list);
    items.forEach(function(item){
        var i = newList.indexOf(item);
        newList.splice(i, i);
    });
    return newList;
};

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
        console.log('读取配置文件失败,请检查', CONFIG_FILE_NAME, COMMON_CONGIG_FILE_PATH);
        process.exit();
    }
    
    var currentLanVersion = R.last(path.resolve('.').split('/')),
        currentPath = path.resolve('.');

    //var productsInclude = commonConfig.product;

    if( i18nConfig.syncDir.exclude.indexOf(currentLanVersion) < 0 ){
        i18nConfig.syncDir.exclude.push(currentLanVersion);
    }
    
    var paths = fs.readdirSync('..').filter(function(path){
        return fs.lstatSync('../' + path).isDirectory();
    }).filter(function(path){
        return IGNORE_SOURCE_DIRS.indexOf(path) < 0;
    });

    

    var products = commonConfig.product;

    var productsNames = Object.keys(products);
    
    var specVersions = Object.keys(i18nConfig.specRule);
    
    if( !specVersions ){
        fis.log.error('');
    }
    
    var includeReg = globToRegExp(i18nConfig.syncDir.include);

    var specRules = Object.keys(i18nConfig.specRule).reduce(function(res, keys){
        if( keys.indexOf(',') ){
            keys.split(',').forEach(function(key){
                res[key] = i18nConfig.specRule[keys];
            });
        } else {
            res[keys] = i18nConfig.specRule[keys];
        }
        return res;
    }, {});
    
    if( args.length === 0 ){
        // 默认的情况

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
                    exclude = commonConfig.rule['default'].exclude;
                } else {
                    exclude = R.concat(commonRule.exclude, spec.exclude);
                }

                var vproducts = i18nConfig.specRule[path].products;
                if( !vproducts ){
                    fis.log.error(path + ' 没有指定同步的产品!');
                    process.exit(0);
                } else {
                    var excludeProducts = removeItems(productsNames, vproducts);
                    
                    excludeProducts.forEach(function(p){
                        products[p].forEach(function(e) {
                            exclude.push(e);
                        });
                    });
                }

                var excludeRegs = exclude.map(function(e){
                    return globToRegExp(syspath.join(syspath.resolve('.'), e));
                });

                fis.log.info('复制 ', path, ' ING.....');
                fis.util.copy(syspath.resolve('.'), syspath.join('../', path), null, excludeRegs);
            }

        });        
        
    } else if( args.length === 1 ){
        // 只表达一个参数 可能是 国家 可能是 products
        
        var command = args[0];

        if( paths.indexOf(command) >= 0 ) {
            var exclude;
            
            if( i18nConfig.specRule[command] ){
                var spec = i18nConfig.specRule[command];
                var commonRule = commonConfig.rule[spec['useCommonRule']];
                
                if( !commonConfig ){
                    exclude = commonConfig.rule['default'].exclude;
                } else {
                    exclude = R.concat(commonRule.exclude, spec.exclude);
                }
                
                var vproducts = i18nConfig.specRule[command].products;
                if( !vproducts ){
                    fis.log.error(path + ' 没有指定同步的产品!');
                    process.exit(0);
                } else {
                    var excludeProducts = removeItems(productsNames, vproducts);
                    excludeProducts.forEach(function(p){
                        products[p].forEach(function(e) {
                            exclude.push(e);
                        });
                    });
                }
                
                var excludeRegs = exclude.map(function(e){
                    return globToRegExp(syspath.join(currentPath, e));
                });

                fis.log.info('复制 ', command, ' ING.....');
                return fis.util.copy(syspath.resolve('.'), syspath.join('../', command), null, excludeRegs);
                fis.log.info('Done!');
            } else {
                return fis.log.warn('你没有在 i18n.config.json 配置好', command, '噢');
            }
            
        }
        
        if( Object.keys(products).indexOf(command) >= 0 ){
            
            paths.filter(function(path){
                return includeReg.test(path);
            }).filter(function(path){
                return i18nConfig.syncDir.exclude.indexOf(path) < 0;
            }).map(function(path){

                if( specVersions.indexOf(path) < 0 ){
                    return; 
                }
                
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
                
                var excludeRegs = exclude.map(function(e) {
                    return globToRegExp(syspath.join(syspath.resolve('.'), e));
                });
                
                var includeRegs = products[command].map(function(e) {
                    return globToRegExp(syspath.join(syspath.resolve('.'), e));
                });
                fis.log.info('复制 ', path, '的', command, ' ING.....');
                return fis.util.copy(syspath.resolve('.'), syspath.join('../', path), includeRegs, excludeRegs);
            });
            fis.log.info('Done!');
        }

        fis.log.warn('What are you talking about?');
        
    } else if( args.length === 2 ){
        // 两个参数 lang + product
        
        var language = args[0],
            productName = args[1];

        if( paths.indexOf(language) < 0 || specVersions.indexOf(language) < 0 ){
            fis.log.warn('没有', language, '啊。');
            return process.exit(0);
        }

        if( productName.indexOf(productName) < 0 ){
            fis.log.warn('你没有配置', productName, '啊。');
            return process.exit(0);
        }

        
        var includeRegs = products[productName].map(function(e){
            return globToRegExp(syspath.join(syspath.resolve('.'), e));
        });

        fis.log.info('复制 ', language, '的', productName, ' ING.....');
        fis.util.copy(syspath.resolve('.'), syspath.join('../', language), includeRegs, null);
    } else {
        fis.log.error('参数不合法');
    }
    
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
