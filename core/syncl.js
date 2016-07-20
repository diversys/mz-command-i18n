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
var removeItems = function(list, items) {
    var newList = Array.prototype.slice.call(list);
    items.forEach(function(item) {
        var i = newList.indexOf(item);
        newList.splice(i, i);
    });
    return newList;
};


// 同步命令入口
var Syncl = function(args) {
    if (!/source$/.test(parentPath)) {
        fis.log.warn('请进入语言路径进行操作!');
        process.exit(0);
    }

    // 配置读取
    var commonConfig; // 同步配置

    try {
        commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    } catch (error) {
        fis.log.warn('读取配置文件失败,请检查', COMMON_CONGIG_FILE_PATH);
        console.log(error);
        process.exit();
    }


    var currentCountry = R.last(syspath.resolve('.').split('/')), // 当前国家
        currentCountryConfig = commonConfig.rule[currentCountry],
        currentPath = syspath.resolve('.'); // 当前路径

    if (!currentCountryConfig) {
        fis.log.warn('该国家不能用于同步哦', COMMON_CONGIG_FILE_PATH); process.exit();
    }

    // 将当前国家添加到排除规则之外，避免自己同步自己
    currentCountryConfig.excludeCountries = (currentCountryConfig.excludeCountries || []);
    if (currentCountryConfig.excludeCountries.indexOf(currentCountry) < 0) {
        currentCountryConfig.excludeCountries.push(currentCountry);
    }

    // 所有国家
    var countrys = fs.readdirSync('..').filter(function(path) {
        return fs.lstatSync('../' + path).isDirectory() && IGNORE_SOURCE_DIRS.indexOf(path) < 0;
    });

    var products = commonConfig.products; // 所有产品的匹配规则
    var productsNames = Object.keys(products); // 所有产品名


    var sCountrys = [],
        product,
        isInit;

    // 参数分配
    args.forEach(function(arg) {
        var argsItems;

        if (arg.indexOf(',') !== -1) {
            argsItems = arg.split(',');
        } else {
            argsItems = [arg];
        }

        argsItems.some(function(argsItem) {
            if (countrys.indexOf(argsItem) !== -1) {
                sCountrys.push(argsItem);
            } else if (productsNames.indexOf(argsItem) !== -1) {
                product = argsItem;
            } else if (argsItem.toLowerCase() === 'init') {
                isInit = true;
            } else {
                fis.log.warn(argsItem + ' ，是什么？是产品名称吗？');
                fis.log.warn('请先在配置 （' + COMMON_CONGIG_FILE_PATH + '） 中配置该产品'); process.exit();
                return true;
            }           
        });
    });

    isInit = product ? isInit : false;

    if (!sCountrys.length) {
        sCountrys = countrys
    }

    sCountrys = sCountrys.filter(function(country) {
        return currentCountryConfig.excludeCountries.indexOf(country) === -1;
    });        
    if (!sCountrys.length) {
        fis.log.warn('请指定有效的国家！'); process.exit();
    }


    inquirer.prompt([{

        type: 'confirm',
        name: 'ok',
        message: ('\n' + '你要同步的国家是: ' + sCountrys.join(', ') + '\n') 
                + (product ? '你要同步的产品是: ' + product + '\n' : '') 
                + (product && isInit ? '这是第一次为该国家创建此产品。' + '\n' : '') + ('确定吗？')

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
            if (!product) {

                // 同步国家
                syncCountry(country);
                return;

            } else {
                // 同步国家 下的该产品 product
                syncCountryProducts(country, product, isInit);
            }
        });
    }


    // 获取排除规则
    function getExcludeOfCountry() {
        var excludesRegs;

        // 排除
        excludesRegs = R.concat(
            commonConfig.rule['default'].exclude,
            (currentCountryConfig.exclude || [])
        );
        excludesRegs = excludesRegs.map(function(e) {
            return syspath.join(currentPath, e);
        });
        return excludesRegs;
    }

    // 同步某一个国家
    function syncCountry(country) {
        var excludesRegs = getExcludeOfCountry();

        // 只同步产品之外文件 既公共文件
        var excludeProducts = removeItems(productsNames, []);

        excludeProducts.forEach(function(p) {
            products[p].forEach(function(e) {
                excludesRegs.push(syspath.join(currentPath, e));
            });
        });

        //console.log(excludesRegs); return;

        fis.log.info('同步 ', country, ' ING...');
        fis.util.copy(syspath.resolve('.'), syspath.join('../', country), null, excludesRegs);
        removeEmptyDir(syspath.join('../', country));
        fis.log.info('同步 ', country, ' DONE...');
    }

    // 同步某个国家下面的产品，isInit 为真代表第一次同步
    //（既忽略公共排除规则，图片，php也复制）
    function syncCountryProducts(country, productName, isInit) {
        if (!products[productName]) {
            return fis.log.warn('你没有在 mz-i18n-conf.json 配置好 ', productName, ' 产品哦');
        }

        var includeRegs = products[productName];
        var excludesRegs;
        // 排除
        excludesRegs = isInit ? [] : getExcludeOfCountry();

        //console.log(excludesRegs); return; 

        fis.log.info('同步 ', productName, ' 到 ', country, ' ING...');
        isInit && fis.log.info('你指定了 init 参数，将为你第一次创建此产品');
        //console.log(includeRegs, excludesRegs);
        fis.util.copy(syspath.resolve('.'), syspath.join('../', country), includeRegs, excludesRegs);
        removeEmptyDir(syspath.join('../', country));
        fis.log.info('同步 ', productName, ' 到 ', country, ' DONE...');
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