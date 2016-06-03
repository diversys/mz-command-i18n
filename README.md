## mz-command-i18n
--- 
for Internationalization merge feature

#### Usage:
`mz i18n help`
 
- init 新建语言版本：先在 source 新建一个文件夹，命名规则请参考 [官网URL命名](http://sapi.meizu.com/index.php/%E5%AE%98%E7%BD%91URL%E5%91%BD%E5%90%8D)。进入文件夹使用命令`mz i18n init` 会问你几个问题，莫慌张，依次填写。在此不在啰嗦。
- edit 打开 vim 编辑配置
- syncl 本地文件同步，从一个国家同步文件至其他国家。
- syncs 同线上同步内容到本地已编译的文件夹dist中，可通过git版本控制查看线上修改内容，此功能有待改进。该功能初次使用时会询问两个项目相关配置`syncsApi`和`syncsDomain`，写入项目package.json中。同时，该功能需要`MZ_FIS_EMAIL`和`MZ_FIS_MANAGE_SECRET`这两个环境变量。
- syncfile 用于国家之间文件的同步
- help 帮助


