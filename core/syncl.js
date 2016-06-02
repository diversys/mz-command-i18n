var syspath = require('path'),
    globToRegExp = require('glob-to-regexp'),
    walk = require('walk'),
    fs = require('fs'),
    inquirer = require('inquirer');

var parentPath = process.cwd().split('/').slice(0, -1).join('/'); // **/source
var CONFIG_FILE_NAME = 'i18n.config.json'; 
var COMMON_CONGIG_FILE_PATH = '../../lib/mz-i18n-conf.json';
var IGNORE_SOURCE_DIRS = ['i18n-php-server'];

var R = require('fw-ramda');

// 从 list数组 中排除 items 数组中的项
var removeItems = function(list, items){
    var newList = Array.prototype.slice.call(list);
    items.forEach(function(item){
        var i = newList.indexOf(item);
        newList.splice(i, i);
    });
    return newList;
};


// 同步命令入口
var Syncl = function(args) {
    if( !/source$/.test(parentPath) ){
        fis.log.warn('请进入语言路径进行操作!');
        process.exit(0);
    }
    
    fis.log.info('开始同步了骚年！');
    
    // 配置读取
    var i18nConfig; // 当前国家目录下的同步配置
    var commonConfig; // 公共同步配置
    
    try {
        i18nConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_NAME));
        commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    } catch (error) {
        console.log('读取配置文件失败,请检查', CONFIG_FILE_NAME, COMMON_CONGIG_FILE_PATH);
        console.log(error);
        process.exit();
    }
    
    // 当前国家
    var currentLanVersion = R.last(syspath.resolve('.').split('/')),
        currentPath = syspath.resolve('.');

    // 将当前国家添加到排除规则之外，避免自己同步自己
    if( i18nConfig.syncDir.exclude.indexOf(currentLanVersion) < 0 ){
        i18nConfig.syncDir.exclude.push(currentLanVersion);
    }
    
    // 所有国家
    var countrys = fs.readdirSync('..').filter(function(path){
        return fs.lstatSync('../' + path).isDirectory() && IGNORE_SOURCE_DIRS.indexOf(path) < 0;
    });

    var products = commonConfig.product; // 所有产品的匹配规则
    var productsNames = Object.keys(products); // 所有产品名
    var specVersions = Object.keys(i18nConfig.specRule); // 所有配置了同步规则的国家
    
    if( !specVersions ){
        fis.log.error('');
    }
    
    // 各个国家同步配置
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


    var sCountrys,
        country,
        product,
        isInit;

    // 参数分配
    args.forEach(function(arg) {
        if (countrys.indexOf(arg) !== -1) {
            country = arg;
        } else if (productsNames.indexOf(arg) !== -1) {
            product = arg;
        } else if (arg.toLowerCase() === 'init') {
            isInit = true;
        }
    });
    isInit = product ? isInit : false;

    sCountrys = countrys.filter(function(country){
        return (i18nConfig.syncDir.exclude.indexOf(country) < 0 && 
                globToRegExp(i18nConfig.syncDir.include).test(country));
    });
    if (country) { 
        if (sCountrys.indexOf(country) === -1) {
            fis.log.error('在 ' + CONFIG_FILE_NAME + ' 中，没有匹配到该国家的配置，请检查');
            return;
        }
        sCountrys = [country]
    }

    inquirer.prompt([{

        type: 'confirm',
        name: 'ok',
        message: (country ? '\n' + '你要同步的国家是: ' + sCountrys.join(' ') + '\n' : '')
                + (product ? '你要同步的产品是: ' + product + '\n' : '')
                + (product && isInit ? '这是第一次为该国家创建此产品。' + '\n': '')
                + ('确定吗？')

    }], function(answers) {
        if (answers.ok) {
            syncGo();
        } else {
            fis.log.info('债见');
            return;
        }
    }); 

    function syncGo() {
        sCountrys.forEach(function(country) {
            if(!product){

                // 同步国家
                syncCountry(country);
                return;

            } else {
                // 同步国家 下的该产品 product
                syncCountryProducts(country, product, isInit);
            }
        });
    } 


    // 获取某一个国家的排除规则
    function getExcludeOfCountry(country) {
        var excludesRegs;
        var spec = specRules[country];
        var commonRule = commonConfig.rule[spec['useCommonRule']];
        
        // 排除
        excludesRegs =  R.concat(
                            commonConfig.rule['default'].exclude, 
                            (commonRule ? commonRule : []),
                            (spec.exclude || [])
                        );
        excludesRegs = excludesRegs.map(function(e){
            return syspath.join(currentPath, e);
        });  
        return excludesRegs;      
    }

    // 同步某一个国家
    function syncCountry(country) {
        if( !specRules[country] ){
            return fis.log.warn('你没有在 i18n.config.json 配置好 ', country, ' 国家噢');
        }

        var excludesRegs = getExcludeOfCountry(country);
        var spec = specRules[country];

        // 排除指定产品之外的其他产品
        var excludeProducts = removeItems(productsNames, spec.products);
        
        excludeProducts.forEach(function(p){
            products[p].forEach(function(e) {
                excludesRegs.push(syspath.join(currentPath, e));
            });
        });
         console.log(excludesRegs); //return;

        fis.log.info('同步 ', country, ' ING...');
        fis.util.copy(syspath.resolve('.'), syspath.join('../', country), null, excludesRegs);
        removeEmptyDir(syspath.join('../', country));
        fis.log.info('同步 ', country, ' DONE...');
    }

    // 同步某个国家下面的产品，isInit 为真代表第一次同步
    // （既忽略公共排除规则，图片，php也复制）
    function syncCountryProducts(country, productName, isInit) {
        if( !specRules[country] ){
            return fis.log.warn('你没有在 i18n.config.json 配置好 ', country, ' 国家哦');
        }
        if( !products[productName] ){
            return fis.log.warn('你没有在 mz-i18n-conf.json 配置好 ', productName, ' 产品哦');
        }
        if( specRules[country].products.indexOf(productName) === -1 ){
            return fis.log.warn('你没有在 i18n.config.json 配置的 ', country, ' 国家中定制 ', productName, ' 产品哦');
        }

        var excludesRegs;
        var spec = specRules[country];

        // 排除
        excludesRegs = isInit ? []: getExcludeOfCountry(country);
        
        var includeRegs = products[productName];

        console.log(excludesRegs); //return; mz i18n syncl id pro6

        fis.log.info('同步 ', productName , ' 到 ', country , ' ING...');
        fis.log.info('你指定了 init 参数，将为你第一次创建此产品');
        fis.util.copy(syspath.resolve('.'), syspath.join('../', country), includeRegs, excludesRegs);
        removeEmptyDir(syspath.join('../', country));
        fis.log.info('同步 ', productName , ' 到 ', country , ' DONE...');
    }

};


// 删除空目录
function removeEmptyDir(dir) {
    var fs = require('fs'),
        path = require('path'),
        fsUtils = require('nodejs-fs-utils'),
        fileList = fs.readdirSync(dir),
        empty = true;

    var currentPath,
        status;


    fileList.forEach(function(fileName) {
        currentPath = path.join(dir, fileName);

        if (currentPath.indexOf('.DS_Store') >= 0) {
            fs.unlinkSync(currentPath);
        } else if (currentPath.indexOf('.svn') >= 0) {
            fsUtils.rmdirsSync(currentPath);
        } else if (fs.statSync(currentPath).isDirectory()) {
            empty = removeEmptyDir(currentPath) && empty;
        } else {
            empty = false;
        }
    });

    if (empty) {
        fs.rmdirSync(dir);
    }
    return empty;
}

module.exports = Syncl;
