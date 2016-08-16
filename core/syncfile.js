
var path = require('path'),
	fs = require('fs'),
	fsUtils = require('nodejs-fs-utils'),
    inquirer = require('inquirer'),
    basePath, // 基本版本
    filePath, // 同步文件路径，基于基本路径
    toPaths, // 要拷贝到哪些目录
   	isForce = false, // 强制一致，既同步之后各个参与同步的目录该文件（夹）将完全一样
   	cwd = process.cwd(),
   	parentDir = '../',
   	currentDir;

function init() {
   	if (!/source.[\w]{2,3}$/.test(process.cwd()) && isValidDir(currentDir)) {
   		console.log('请先进入指定国家路径操作!');
   		return;
   	}
	currentDir = cwd.match(/[\/\\]\w+$/)[0].slice(1);
   	askSomeThing(currentDir, action);
}

// ？？
function askSomeThing(currentDir, callback) {
	var currentDir = currentDir;
		options = {
			filePath: '',
			basePath: '',
			toPaths: [],
			isForce: false
		};

	var step = [
		// 1 step
		function() {
		    inquirer.prompt([{
		        type: 'input',
		        name: 'syncType',
		        message: '\n请选择：\nA: 从其它国家同步某文件到当前国家 \nB: 从当前国家同步文件到其他国家\n',
		        filter: function(value) {
		        	return value.toLowerCase().replace(/[^ab]/g, '');
		        },
				validate: function(value) {
		            if (/^[ab]$/i.test(value)) {
		                return true;
		            } else {
		                return '请选择A 或 B';
		            }
		        }
		    }], function(answers) {
		    	if (answers.syncType === 'a') {
		    		step[1]();
		    	} else {
		    		step[2]();
		    	}
		    });
		},

		// 2 step
		function() {
	    	//从其它国家同步某文件到当前国家
        	inquirer.prompt([{
        		type: 'input',
        		name: 'basePath',
        		message: '从那个国家（如 cn）同步文件？',
        		filter: function(value) {
        			return value.replace(/\s/, '');
        		},
        		validate: function(value) {
        			if (isValidDir(value) && value !== currentDir) {
        				return true;
        			} else {
        				return '请输入除此国家之外一个有效的国家';
        			}
        		}
        	}], function(answers) {
        		options.toPaths = [currentDir];
        		options.basePath = answers.basePath;
        		step[3]();
        	});			
		},


		// 3 step
		function() {
        	// 从当前国家同步文件到其他国家
        	inquirer.prompt([{
        		type: 'input',
        		name: 'toPaths',
        		message: '要同步哪些国家用逗号隔开（如 cn,en, hk）？ 输入为空则同步所有其他国家！',
        		validate: function(value) {
        			value = value.replace(/\s/, '').split(',');
        			if (value.join('') === '') {
        				value = getAllDir();
        			}
        			value = value.filter(function(v) {
        				return (isValidDir(v)&&v!==currentDir);
        			});
        			if (value.length === 0) {
        				return '请输入有效的国家';
        			} else {
	        			return true;
        			}
        		}
        	}], function(answers) {
    			value = answers.toPaths.replace(/\s/, '').split(',');
    			if (value.join('') === '') {
    				value = getAllDir();
    			}
    			value = value.filter(function(v) {
    				return (isValidDir(v)&&v!==currentDir);
    			});
    			options.basePath = currentDir;
    			options.toPaths = value;
        		step[3]();
        	});			
		},

		// 4 step
		function() {
			inquirer.prompt([
				{
					type: 'input',
					name: 'filePath',
					message: '请指定要复制的文件（夹）',
					filter: function(value) {
						return value.trim();
					},
					validate: function(value) {
						if (!value.trim()) return '？';
						try {
			    			fs.statSync(path.normalize(parentDir + options.basePath + '/' + value));
						} catch(e) {
							console.log(e)
							return '无法找到该文件，请重新指定';
						}
						return true;
					}
				}
			], function(answers) {
				options.filePath = answers.filePath;
				
				if (fs.statSync(path.join(parentDir + options.basePath, options.filePath)).isDirectory()) {
					step[4]();
				} else {
					callback(options);
				}
			});
		}, 
		function() {
			inquirer.prompt([
				{
					type: 'confirm',
					name: 'isForce',
					message: '要使复制之后的文件完全一致吗？ 目标文件夹中多余的文件会被删除！',
				}		
			], function(answers) {
				options.isForce = answers.isForce;
				callback(options);
			});			
		}

	];

	step[0]();
}


/*
 * 判断是否是有效的目录
 */
function isValidDir(dir) {
	var Dirs = getAllDir();

	function _isValidDir(dir) {
		return (Dirs.indexOf(dir) !== -1);
	}
	isValidDir = _isValidDir;
	return isValidDir(dir);
}

/*
 * 全部有效的目录
 */
function getAllDir () {
	return (fs.readdirSync(parentDir)
			.map(function(fileName) {return fileName})
			.filter(function(fileName) { return (fileName.length < 3)}));
}

/*
 * 动手
 */
function action(options) {
   	filePath = options.filePath;
   	basePath = path.normalize(path.join(cwd, parentDir, options.basePath, filePath));
   	toPaths = options.toPaths.map(function(toPath) {
   		return path.normalize(path.join(cwd, parentDir, toPath, filePath));
   	});
   	isForce = options.isForce;

   	toPaths.forEach(function(toPath) {
   		syncFile(basePath, toPath, isForce);
   	});
}

/*
 * 同步 
 * @param sourcePath 源文件路径
 * @param toPath 目标路径
 * @param isForce 强制一致
 */
function syncFile(sourcePath, toPath, isForce) {
	//console.log(sourcePath, toPath, isForce); return;

	var stats = fs.statSync(sourcePath);

	if (stats.isDirectory()) {
		if (isForce) {
			try {fsUtils.emptyDirSync(toPath)} catch(e) {}
		}
	}
	fsUtils.copySync(sourcePath, toPath, function (err, cache) {
        if (!err) {
            console.log(toPath + " Copied !");
        } else {
            console.error("Error", err)
        }
    });
}

module.exports = init;
