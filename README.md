# Bilibili新番组

自动检查 [Bilibili](http://www.bilibili.tv/) 的新番栏目（[RSS](http://www.bilibili.tv/rss-13.xml)），生成节目列表。

可以在设置中添加追番的关键字，当匹配关键字的动漫更新时及时得到通知。

### 安装

代码仓库中有打包好的crx文件，安装方法见 [如何在 Chrome 浏览器安装 Web Store 外的第三方扩展程序](http://www.geekpark.net/read/view/161039)

### 其他

理论上也支持其他任意标准RSS，在 `js/framework.js` 中替换 `Bilibili.rss` 即可。