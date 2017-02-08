
var http = require('http'),
    fs = require('fs'),
    //globToRegExp = require('glob-to-regexp'),
    colors = require('colors'),
    //async = require('async'),
    request = require('request'),
    inquirer = require('inquirer'),
    path = require('path'),
    _ = require('lodash');

var Util = require('./util');

var syncsDownload,
    syncsSync,
    syncsDomain,
    sercetToken;

var currentPath = process.cwd();

var Syncs = function(input){
    runSync(input);
};

var runSync = function(input){
    
    if( !/source$/.test(path.resolve(currentPath, '..')) ){
        fis.log.warn('请先进入指定国家路径操作!');
        process.exit(0);
    }

    var rootPath = Util.getProjectRoot();
    var ppkg;
    try {
        ppkg = Util.readJSON(rootPath + '/package.json');
    } catch(err) {
        fis.log.error(err);
        fis.log.error('请检查当前目录');
        process.exit(0);
    }
    
    
    if( input.length === 0 ){
        fis.log.warn('请指明 sqa 或者 prod!');
        process.exit(0);
    }
    
    var env = input[0];

    var envKeys;
    try {
        envKeys = Object.keys(ppkg.fisConfig.api);
    } catch(err) {
        
        fis.log.warn('请检查 package.json api 配置.');
        process.exit(0);
        
        
    }
    
    
    if( envKeys.indexOf(env) < 0 ){
        fis.log.warn('没有 ' + env + ' 这个环境!');
        process.exit(0);
    }

    try {
        syncsDownload = ppkg.fisConfig.api[env].download;
        syncsSync = ppkg.fisConfig.api[env].sync;
        sercetToken = ppkg.fisConfig.api[env].token;
        syncsDomain = ppkg.fisConfig.domain;
    } catch (err) {
        
        fis.log.error('请检查 package.json 配置.');
        fis.log.error(err);
        process.exit(0);
    }
    
    syncServer();
};

var timestamp;
var buildTimestamp = function(){
    if( !timestamp ){
        timestamp = (+ new Date());
    }
    return ++timestamp;
};

var getFileNeedSync = function() {
    return new Promise(function(resolve, reject){
        var t = buildTimestamp();
        var params = {
            email: getEmail(),
            domain: syncsDomain,
            t: t,
            token: getToken(t)
        };
        var url = syncsSync +  '?' + Object.keys(params).map(function(k){
            return k + '=' + params[k];
        }).join('&');
        request.get({
            url: url
        }, function(err, httpResponse, body) {

            if( err ) {
                return reject(new Error('network error'));
            }
            if( !checkValid(body) ){

                return reject(body);
            }
            body = JSON.parse(body);
            if( body.status != 200 ){
                return reject(body.message);
            } else {
                return resolve(body.result.list);
            }
        });
    });
};

var tellSyncDone = function(filepath){
    return new Promise(function(resolve, reject) {
        var t = + new Date();
        request.post({
            url: syncsSync,
            form: {
                to: filepath,
                email: getEmail(),
                domain: syncsDomain,
                t: t,
                token: getToken(t)
            }
        }, function(err, httpResponse, body) {
            
            if( err ) {
                return reject(new Error('Network Error!'));
            }
            if( !checkValid(body) ){
                return reject(body);
            }
            body = JSON.parse(body);

            if( body.status != 200 ){

                return reject(body.message);
                
            } else {

                return resolve(body.result);
            }
        });
    });
};

var syncFile = function(fileurl, targetFilePath) {
    return new Promise(function(resolve, reject) {
        var t = + new Date();
        request.post({
            url: syncsDownload,
            form: {
                to: fileurl, 
                email: getEmail(),
                domain: syncsDomain,
                t: t,
                token: getToken(t)
            }
        }, function(err, httpResponse, body) {
            if( err ) {
                return reject(new Error('Network Error'));
            }
            if( !checkValid(body) ){
                return reject(body);
            }
            updateFile(body, targetFilePath, function(){
                tellSyncDone(fileurl).then(function(data){
                    return resolve(data);
                }, function(err){
                    return reject(err);
                });
            });
        });
    });
};

var syncServer = function(){ //tellSyncDone('server-conf/cn.conf'); return;


    var pwd = process.cwd(),
        namespace = pwd.split('/')[pwd.split('/').length - 1];

    
    
    getFileNeedSync().then(function(filelist){
        if( !filelist.some(file=>file.indexOf(`/${namespace}/`) > -1) ){
            fis.log.info('这个版本没有需要同步的内容');
            return;
        }
        filelist.map(function(file){ 
            
            var a = file.split('/');

            var targeFilePath;
            if( a[0] === 'test' && a[1] === namespace ){
                targeFilePath =  path.join('test', _.drop(a, 2).join('/'));
            }

            if( a[0] === 'config' && a[1] === 'lang'){
                if( a[2].split('.')[0] === namespace ){
                    targeFilePath = path.join('lang', _.drop(a[2].split('.'), 1).join('.'));
                }
            }

            if( a[0] === 'template' && a[1] === namespace ){
                targeFilePath = _.drop(a, 2).join('/');
            }
            
            if( a[0] === 'server-conf') {
                targeFilePath = 'server.conf';
            }

            if( targeFilePath ){
                syncFile(file, targeFilePath).then(function(){
                    
                }, function(err){
                    fis.log.error(err);
                });
            }
        });
    }, function(err){
        fis.log.warn(err, '请检查环境变量 [MZ_FIS_EMAIL | MZ_FIS_MANAGE_SECRET]');
    }).catch(function(e) {console.log(e.stack);});
};


var updateFile = function(newContent, filePath, cb){
    fs.writeFile(filePath, newContent, function(err){
        if ( err ) {
            console.log(('write file[ ' + filePath + '] fail!').underline.bgYellow.red);

        } else {

            console.log(('write file[ ' + filePath + '] successful!').underline.green);
            cb && cb();
        }
    });
};

var checkValid = function(response){
    return !/验证失败/.test(response);  
};

var getToken = function(date){
    var manageKey = sercetToken || process.env.MZ_FIS_MANAGE_SECRET;
    if ( !manageKey ) {
        fis.log.error('找不到 MZ_FIS_MANAGE_SECRET 这个环境变量');
        process.exit();
    }
    return fis.util.md5(fis.util.md5(date +  manageKey ,32), 32);
};

var getEmail = function(){
    var email = process.env.MZ_FIS_EMAIL;
    if ( !email ) {
        fis.log.error('找不到 MZ_FIS_EMAIL 这个环境变量');
        process.exit();
    }
    return email;
};

module.exports = Syncs;
