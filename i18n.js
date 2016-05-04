/*
 * mz-team
  */

'use strict';

var fs = require('fs'),
    colors = require('colors'),
    lolcat = require('fis-lolcat'),
    meow = require('meow'),
    R = require('fw-ramda');

var Syncl = require('./core/syncl'),
    Syncs = require('./core/syncs'),
    Edit = require('./core/edit'),
    Init = require('./core/init'),
    syncFile = require('./core/syncfile');

 exports.name = 'i18n';
 exports.usage = 'i18n <origin>';
 exports.desc = 'i18n';


var config = require('./config');

exports.register = function(commander) {

  var i18n = meow({
    help: [
      'Usage',
      '  mz i18n [origin language version]'
    ]
  });

    var cmd = i18n.input[1];

  needHelp(i18n.flags);
  
  switch ( cmd ) {
  case 'syncs': //sync server
      Syncs();
    break;

  case 'syncl': //sync loacl
      Syncl(R.drop(2, i18n.input));
    break;

  case 'init': 
    Init();
    break;

  case 'edit':
    Edit();
    break;

  case 'syncfile'://文件同步，从其他国家同步某文件（夹）到当前国家，或当前-》其他or指定
    syncFile();
    break;

  case 'help':
    help();
    break;

  case 'gift':
    gift();
    break;

  default:
    help();
    break;
  } 
};

var needHelp = function(flags){
  if ( flags.h || flags.help ) {
    help();
    process.exit();
  }
};

var gift = function(){
  var content = fs.readFileSync(__dirname + '/.sex.ascii', 'utf-8');
  console.log();
  console.log();
  console.log(lolcat(content));
  process.exit();
};

var help = function(){
  var content = [
    '',
    '                HELPING YOU! MY SAO NIAN!        '.red,
    '',
    '                init             --   初始化'.rainbow,
    '                edit             --   编辑_i18n'.rainbow,
    '                syncl            --   同步本地'.rainbow,
    '                syncs            --   同步线上'.rainbow,
    '                syncfile         --   国家之间同步文件'.rainbow,
    '                help             --   i18n的救赎'.rainbow,
    '                gift             --   送给骚年们的礼物'.rainbow,
    ''
  ].join('\n');
  console.log(content);
};
