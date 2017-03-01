/*
 * mz-team
 */

'use strict';

var fs = require('fs'),
    colors = require('colors'),
    meow = require('meow'),
    R = require('fw-ramda');

var Syncl = require('./core/syncl'),
    Syncs = require('./core/syncs'),
    Init = require('./core/init'),
    syncFile = require('./core/syncfile');

exports.name = 'i18n';
exports.usage = 'i18n <origin>';
exports.desc = 'i18n';


exports.register = function(commander) {

    var i18n = meow({
        help: [
            'Usage',
            '  mz i18n [origin language version]'
        ]
    });

    var cmd = i18n.input[1];

    needHelp(i18n.flags);

    switch (cmd) {
        case 'syncs': //sync server
            Syncs(R.drop(2, i18n.input));
            break;

        case 'syncl': //sync local
            Syncl(R.drop(2, i18n.input));
            break;

        case 'init':
            Init(R.drop(2, i18n.input));
            break;

        case 'syncfile': //文件同步，从其他国家同步某文件（夹）到当前国家，或当前-》其他or指定
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

var needHelp = function(flags) {
    if (flags.h || flags.help) {
        help();
        process.exit();
    }
};

var gift = function() {
    var content = fs.readFileSync(__dirname + '/.sex.ascii', 'utf-8');
    console.log();
    console.log();
    console.log(content);
    process.exit();
};

var help = function() {
    var content = [
        '',
        // '                HELPING YOU! MY SAO NIAN!        '.red,
        '',
        '                init             --   初始化新的国家'.rainbow,
        '                syncl            --   国家之间同步文件'.rainbow,
        '                syncs            --   同步线上修改'.rainbow,
        // '                syncfile         --   国家之间同步文件'.rainbow,
        ''
    ].join('\n');
    console.log(content);
};
