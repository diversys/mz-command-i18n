const COMMON_CONGIG_FILE_PATH = '../../lib/mz-i18n-conf.json';
const IGNORE_SOURCE_DIRS = ['i18n-php-server'];

let path = require('path');
let globToRegExp = require('glob-to-regexp');
let walk = require('walk');
let fs = require('fs');
let inquirer = require('inquirer');
let R = require('fw-ramda');

let parentPath = process.cwd().split('/').slice(0, -1).join('/');


// 从 list数组 中排除 items 数组中的项
let removeItems = function(list, items) {
    let newList = Array.prototype.slice.call(list);
    items.forEach(function(item) {
        let i = newList.indexOf(item);
        newList.splice(i, i);
    });
    return newList;
};

// 同步命令入口
let Syncl = function() {
    if (!/source$/.test(parentPath)) {
        fis.log.warn('请先进入指定国家路径操作!');
        process.exit(0);
    }

    // 配置读取
    let commonConfig; // 同步配置

    try {
        commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    } catch (error) {
        fis.log.warn('读取配置文件失败,请检查', COMMON_CONGIG_FILE_PATH);
        console.log(error);
        process.exit(0);
    }

    let currentCountry = R.last(path.resolve('.').split('/'));// 当前国家

    // 所有国家
    let countrys = fs.readdirSync('..').filter(function(filename) {
        return fs.lstatSync('../' + filename).isDirectory() && IGNORE_SOURCE_DIRS.indexOf(filename) < 0;
    });

    let rulesNames = Object.keys(commonConfig.rules); // 所有规则名
    let sCountrys = [],
        rules=[],
        isForce;

    // 参数分配
    R.slice(4, Infinity, process.argv).forEach(function(arg) {
        let argsItems;

        if (arg.indexOf(',') !== -1) {
            argsItems = arg.split(',');
        } else {
            argsItems = [arg];
        }

        argsItems.some(function(argsItem) {
            if (countrys.indexOf(argsItem) !== -1) {
                sCountrys.push(argsItem);
            } else if (rulesNames.indexOf(argsItem) !== -1) {
                rules.push(argsItem);
            } else if (argsItem.toLowerCase() === '-f') {
                isForce = true;
            } else {
                fis.log.warn(`${argsItem} 是什么？是同步规则吗？`);
                fis.log.warn(`如果是，请先在 ${COMMON_CONGIG_FILE_PATH} rules 选项中配置该同步规则`); 
                process.exit();
                return true;
            }           
        });
    });

    isForce = rules ? isForce : false;

    if (!sCountrys.length) {
        sCountrys = countrys
    }

    sCountrys = sCountrys.filter(function(country) {
        return country !== currentCountry;
    });        
    if (!sCountrys.length) {
        fis.log.warn(`请指定除当前国家之外的有效国家！`); process.exit();
    }
    if (!rules.length) {
        fis.log.warn(`请指定至少一条同步规则，规则在 ${COMMON_CONGIG_FILE_PATH} rules 选项中配置！`); process.exit();
    }


    inquirer.prompt([{

        type: 'confirm',
        name: 'ok',
        message: `\n你要同步的国家是: ${sCountrys.join(', ')}\n` +
                `你使用的同步规则是: ${rules.join(', ')}\n`+
                `${isForce ? '你使用了 -f 参数，将忽略配置里的 exclude':''}\n` +
                `确定吗？`

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
            rules.forEach((ruleName)=>{
                console.log('\n');
                fis.log.info(`正在使用同步规则 ${ruleName} 同步文件到 ${country}...`);
                syncCountryByRule(
                    country, 
                    commonConfig.rules[ruleName], 
                    isForce
                );
                fis.log.info(`使用同步规则 ${ruleName} 同步文件到到 ${country} 成功！`);
            });
        });
    }

    // 同步某个国家下面的产品
    function syncCountryByRule(country, rule, isForce) {

        let includeRegs;
        let excludesRegs = [];

        if (rule.include) {
            // rule is object
            includeRegs = rule.include; 
            excludesRegs = rule.exclude || excludesRegs;
        } else {
            includeRegs = rule; // rule is array of include 
        }

        includeRegs = (typeof includeRegs==='string' ? [includeRegs] : includeRegs);
        excludesRegs = (typeof excludesRegs==='string' ? [excludesRegs] : excludesRegs);

        if (!isForce) {
            // isForce 为真代表忽略公共排除规则
            excludesRegs = R.concat(excludesRegs, commonConfig.exclude);
        }

        // console.log(includeRegs, excludesRegs); 
        fis.util.copy(path.resolve('.'), path.join('../', country), includeRegs, excludesRegs);
        removeEmptyDir(path.join('../', country));
    }
};

// 删除空目录
function removeEmptyDir(dir) {
    let fs = require('fs'),
        fsUtils = require('nodejs-fs-utils'),
        fileList = fs.readdirSync(dir),
        empty = true;

    let currentPath,
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