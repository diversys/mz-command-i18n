

var Util = {
  makeReg: function(regStrings){
    var regArr = [];
    regStrings.forEach(function(regS){
      regArr.push( new RegExp(regS));
    });
    return regArr;
  }

};

module.exports = Util;
