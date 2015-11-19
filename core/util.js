var fs = require('fs');

var isDir = function(path){
    try {
        var stats = fs.lstatSync(path);
        if ( stats.isDirectory() ) {
            return true;
        }
    } catch (e) {
        return false;
    }
};


var Util = {
  makeReg: function(regStrings){
    var regArr = [];
    regStrings.forEach(function(regS){
      regArr.push( new RegExp(regS));
    });
    return regArr;
  },

  readJSON: function(path){
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  },

  getProjectRoot: function(){
    return findProjectRoot(process.cwd());
  },
    isDir: isDir
};

var findProjectRoot = function(path){
  if ( fs.existsSync(path + '/package.json') ) {
    return path;
  } else {
    return findProjectRoot(path.split('/').slice(0, -1).join('/'));
  }
};




module.exports = Util;
