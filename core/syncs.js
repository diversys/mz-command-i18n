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

//TODO put it in
var config = require('../config');

var i18nConfig;

var syncsDownload,
    syncsSync,
    syncsDomain;

// var poReg = globToRegExp('/lang/*');
// var matches = fis.media().getSortedMatches();

var failedFilesQueue;
var filesNum = 0;

var poSuccessN = 0,
    poFailN = 0,
    testSuccessN =0,
    testFailN = 0,
    fileSuccessN = 0,
    fileFailN = 0;

var currentPath = process.cwd();


var Syncs = function(){
    try {
        i18nConfig = Util.readJSON(config.i18nFile);
    } catch(error) {
        i18nConfig = null;
    }
    runSync();
};



var runSync = function(){

    var rootPath = Util.getProjectRoot();
    var ppkg = Util.readJSON(rootPath + '/package.json');

    var requireQs = {
        download: {
            type: 'input',
            name: 'download',
            message: '告诉我同步下载接口!',
            validate: function(value) {
                if (value.trim() === '' || value === null) {
                    return '输入一下呗！';
                } else if (!/^http[s]*:\/\//.test(value)) {
                    return 'miss http://????????????';
                } else {
                    return true;
                }
            }
        },
        sync: {
            type: 'input',
            name: 'sync',
            message: '告诉我同步下载接口!',
            validate: function(value) {
                if (value.trim() === '' || value === null) {
                    return '输入一下呗！';
                } else if (!/^http[s]*:\/\//.test(value)) {
                    return 'miss http://????????????';
                } else {
                    return true;
                }
            }
        },
        syncsDomain: {
            type: 'input',
            name: 'syncsDomain',
            message: 'which doman? [www.meizu.com|m.meizu.com]'
        }
    };

    var requiredNeedPrompt = [];

    // TODO do it better
    if( !ppkg.syncsApi ){
        requiredNeedPrompt.push(requireQs.sync);
        requiredNeedPrompt.push(requireQs.download);
    } else {
        if( !ppkg.syncsApi.sync ){
            requiredNeedPrompt.push(requireQs.sync);
        }
        if( !ppkg.syncsApi.download ){
            requiredNeedPrompt.push(requireQs.download);
        }
    }

    if( !ppkg.syncsDomain ){
        requiredNeedPrompt.push(requireQs.syncsDomain);
    }
    
    // Object.keys(requireQs).map(function(k){
    //     if( !ppkg['syncsApi'] ){
    //         requiredNeedPrompt.push(requireQs[k]);
    //     } else if ( !ppkg['syncsApi'][k] ) {
    //         requiredNeedPrompt.push(requireQs[k]);
    //     }
    // });

    var start = function(){
        syncsDownload = ppkg.syncsApi.download;
        syncsSync = ppkg.syncsApi.sync;
        syncsDomain = ppkg.syncsDomain;
        syncServer();
    };
    
    if ( requiredNeedPrompt.length !== 0 ) {
        inquirer.prompt(requiredNeedPrompt, function(answers){            
            // Object.keys(requireQs).map(function(k){
            //     ppkg[k] = answers[k];
            // });
            Object.keys(answers).map(function(k){
                // TODO do it better
                if( k === 'donwload' || k === 'syncs' ){
                    ppkg.syncsApi[k] = answers[k];
                } else {
                    ppkg[k] = answers[k];
                }

                
            });        
            fs.writeFileSync(rootPath + '/package.json', JSON.stringify(ppkg, null, '  '));
            start();
        });
    } else {
        start();
    }
    
    // if ( !ppkg.syncsApi ) {
    //     inquirer.prompt([{
    //         type: 'input',
    //         name: 'syncsApi',
    //         message: 'tell me sync server url!',
    //         validate: function(value) {
    //             if (value.trim() === '' || value === null) {
    //                 return '输入一下呗！';
    //             } else if (!/^http[s]*:\/\//.test(value)) {
    //                 return 'miss http://????????????';
    //             } else {
    //                 return true;
    //             }
    //         }
    //     }], function(answer) {
    //         syncsApi = answer.syncsApi;
    //         ppkg.syncsApi = syncsApi;
    //         fs.writeFileSync(rootPath + '/package.json', JSON.stringify(ppkg, null, '  '));
    //         syncServer();
    //     });
    // } else {
    //     syncsApi = ppkg.syncsApi;
    //     syncServer();
    // }
};

var getFileNeedSync = function(){
    return new Promise(function(resolve, reject){
        var t = + new Date();
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

var syncServer = function(){


    var pwd = process.cwd(),
        namespace = pwd.split('/')[pwd.split('/').length - 1];
    

    
    getFileNeedSync().then(function(filelist){


        
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
            
            if( targeFilePath ){
                syncFile(file, targeFilePath).then(function(){
                    
                }, function(err){
                    fis.log.error(err);
                });
            }
        });
    }, function(err){
        fis.log.error(err);
    });
    
    // var pattern = fis.media().get('project.files');
    // var files = fis.project.getSourceByPatterns(pattern);

    //filesNum = files.length;
    
    // var syncsDirRegs = config.syncsDirs.map(function(regs){
    //     return globToRegExp(regs);
    // });

    // var seriesRequest = [];
    // var seriesPoRequest = [];
    // var seriesTestRequest = [];
    
    // _.tap(Object.keys(files), function(tf){

    //     tf.map(function(file){
            
    //         //get lang to syncs
    //         var langReg = new RegExp('^/lang/*', 'g');
    //         if ( langReg.test(file) ) {
    //             var serverCustomPoFile =  files[file].release;
    //             var scpt = serverCustomPoFile.split('.');
    //             scpt.splice(-1, 0, 'custom');
    //             serverCustomPoFile = scpt.join('.');

    //             seriesPoRequest.push(function(cb){
    //                 //callback function
    //                 requestServer(file.slice(1), serverCustomPoFile, function(exist, content){
    //                     if ( exist ) {
    //                         updatePoFile(content, file.slice(1));//trim '/';
    //                         poSuccessN++;
    //                     } else {
    //                         //server not exist but not a error
    //                         poFailN++;
    //                         //console.log(('INFO:  po文件[ ' + file.slice(1) + ' ]没有需要同步的内容!'));
    //                     }
    //                     //async module next
    //                     cb(null, true);
    //                 });
    //             });
    //         }
    //     });

    //     tf.map(function(file){
    //         //take test file
    //         var testReg = new RegExp('^/test/*', 'g');
    //         if ( /\/test\/*/g.test(file) ) {
    //             var serverCustomTestFile = toCustomName(files[file].release);
    //             seriesTestRequest.push(function(cb){
    //                 requestServer(file.slice(1), serverCustomTestFile, function(exist, content){
    //                     if ( exist ) {
    //                         updateTestFile(content, file.slice(1));
    //                         testSuccessN++;
    //                     } else {
    //                         testFailN++;
    //                     }
    //                     cb(null, true);
    //                 });
    //             });
    //         }
    //     });


    // }).filter(function(file){
    //     //filter not need
    //     return syncsDirRegs.some(function(reg){
    //         return reg.test(file);
    //     });
    // }).map(function(file){
    //     //map normal file
    //     var filePath = file.slice(1);
    //     seriesRequest.push(function(cb){
    //         requestServer(filePath, files[file].release, function(exist, content){
    //             if ( exist ) {
    //                 updateFile(content, '../../dist' + files[file].release);
    //                 //updateFile(content, file.slice(1));
                    
    //             } else {
    //                 fileFailN++;
    //                 console.log(('Error:  服务器说线上不存在[ ' + filePath + ' ]这个文件!').red);
    //             }
    //             cb(null, true);
    //         });
    //     });
    // });

    // //sync request start
    // // po first
    // async.series(seriesPoRequest, function(err, rst){
    //     // test scecond
    //     async.series(seriesTestRequest, function(err, rst){
    //         // anthor last
    //         async.series(seriesRequest, function(err, rst){
    //             showRst();
    //         });
    //     });
    // });
};

// var toCustomName = function(filename){
//     var scpt = filename.split('.');
//     scpt.splice(-1, 0, 'custom');
//     return  scpt.join('.');
// };

// var showRst = function(){
//     console.log();
//     console.log(('PO 语言文件同步成功 ' + poSuccessN + ' 个!').green);
//     console.log(('TEST 文件同步成功 ' + testSuccessN + ' 个!').green);
//     //console.log(('PO 语言文件同步失败 ' + poFailN + ' 个!').bgYellow.red);
//     console.log(('文件同步成功 ' + fileSuccessN + ' 个!').green);
//     console.log(('文件同步失败 ' + fileFailN + ' 个!').bgYellow.red);
//     console.log();
// };

var updateFile = function(newContent, filePath, cb){
    fs.writeFile(filePath, newContent, function(err){
        if ( err ) {
            console.log(('write file[ ' + filePath + '] fail!').underline.bgYellow.red);
            fileFailN++;
        } else {
            fileSuccessN++;
            console.log(('write file[ ' + filePath + '] successful!').underline.green);
            cb && cb();
        }
    });
};

var updatePoFile = function(newContent, filePath){
    console.log('UPDATE PO FILE'.bgGreen);
    var content;
    try {
        content = JSON.parse(newContent);
    } catch(error) {
        fis.log.error('解析线上PO内容JSON出了点问题，呵呵哒！');
    }
    var poContent = fs.readFileSync(filePath, 'utf-8');
    poContent = replaceMsgstr(poContent, content);
    updateFile(poContent, filePath);
};

var updateTestFile = function(content, filePath){
    var reg = new RegExp('=>(\\s\'\/)(.*\/)(\'\.)', 'g');
    if ( i18nConfig ) {
        content = content.replace(reg, function($0 ,$1, $2, $3){
            return $1 + i18nConfig.namespace + '/' + $2 + $3;
        });
    }
    updateFile(content, filePath);
};
 
// var requestServer = function(filePath, fileRelease, cb){
//     var t = + new Date();

//     request.post({
//         url: syncsDownload,
//         form: {
//             to: fileRelease,
//             email: getEmail(),
//             domain: syncsDomain,
//             t: t,
//             token: getToken(t)
//         }
//     }, function(err, httpResponse, body) {
//         // console.log("syncsApi = ", syncsApi);
//         // console.log("err = ", err);

//         // console.log("response ============================ ".red);
//         // console.log(JSON.stringify(httpResponse).yellow);

//         // console.log("body ================================ ".red);
//         // console.log(body.green);

//         // console.log(filePath.blue);

//         checkValid(httpResponse);
//         if ( !checkServerFileExist(httpResponse) ) {
//             return cb(false);
//         } else {
//             //console.log("err = ", err);
//             return cb(true, body);
//         }
//     });

// };

var checkValid = function(response){
    // if ( response.body === '加密验证失败验证失败' ) {
    //     fis.log.error('加密验证失败验证失败');
    // }
    return !/验证失败/.test(response);  
};


// var checkServerFileExist = function(response){
//     if ( response.statusCode === 404 ) {
//         return false;
//     } else {
//         return true;
//     }
// };


// var replaceMsgstr = function(content, customData){
//     Object.keys(customData).map(function(msgid){
//         var reg = new RegExp(msgid + '"[\\s]*\\nmsgstr[\\s]*".*');
//         content = content.replace(reg, msgid + '"\nmsgstr ' + customData[msgid]);
//     });
//     return content;
// };

var getToken = function(date){
    //var manageKey = process.env.MZ_FIS_MANAGE_SECRET;
    var manageKey = '8jM7LW9F1rwYfRYS4Lm';
    if ( !manageKey || manageKey === '' ) {
        fis.log.error('大哥，俺找不到 MZ_FIS_MANAGE_SECRET 这个环境变量');
        process.exit();
    }
    return fis.util.md5(fis.util.md5(date +  manageKey ,32), 32);
};

var getEmail = function(){
    var email = process.env.MZ_FIS_EMAIL;
    if ( !email || email === '' ) {
        fis.log.error('大哥，俺找不到 MZ_FIS_EMAIL 这个环境变量');
        process.exit();
    }
    return email;
};

module.exports = Syncs;
