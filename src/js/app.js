'use strict';

var Bilibili = Bilibili || {};

Bilibili.config = {
    name: 'Bilibili新番组',
    rss: 'http://www.bilibili.tv/rss-13.xml',
    web: 'http://www.bilibili.tv/video/bangumi.html',
    message: {
        one: '{{title}} 上线啦！还不快去撸一发？',
        multi: '发现 {{number}} 个新番，不去瞧瞧吗？'
    },
    timer: {
        notification: 10 * 1000,
        background: 300 * 1000
    }
};

Bilibili.App = angular.module('bilibili', [
    'Services'
]);

Bilibili.Services = angular.module('Services', []);

/**
 * Database Service
 * 本地存储服务
 */
Bilibili.Services.factory('Database', function() {
    var self = {};

    self.set = function(key, value) {
        var data = angular.toJson(value); // 使用angular.toJson可排除ng-repeat给对象添加的$$haskKey等属性
        localStorage.setItem(key, data);
    };

    self.get = function(key) {
        var data = localStorage.getItem(key);
        return angular.fromJson(data);
    };

    return self;
});

/**
 * RSS Service
 * RSS服务 下载和解析RSS
 */
Bilibili.Services.factory('RSS', ['$q', '$http', 'Database', function($q, $http, Database) {
    var self = {};

    var __decodeXML = function(string) {
        return $('<div />').html(string).text();
    };

    var __generateFollowRegExp = function() {
        var reg;
        var keywords = Database.get('keywords') || [];
        if (keywords.length) {
            reg = _.pluck(keywords, 'word').join('|');
        } else {
            reg = '^$';
        }
        return new RegExp(reg, 'i');
    };

    self.parse = function(string) {
        if (!_.isString(string)) {
            return null;
        }
        if (!string.length) {
            return null;
        }
        var $xml = $($.parseXML(string));
        var list = {update:[], follow:[]};
        var re = __generateFollowRegExp();
        $xml.find('item').each(function(){
            var $t = $(this);
            var link = $t.find('link').text();
            var title = $t.find('title').text();
            if (title.length > 0) {
                var item = {link: link, title: __decodeXML(title)};
                if (re.test(item.title)) {
                    list.follow.push(item);
                }
                list.update.push(item);
            }
        });
        return list;
    };

    self.download = function(url) {
        var deferred = $q.defer();

        $http.get(url).success(function(data, status, headers, config) {
            var list = self.parse(data);
            deferred.resolve({xml: data, list: list});
        }).error(function(data, status, headers, config) {
            deferred.reject('fail');
        });
        return deferred.promise;
    };

    return self;
}]);

/**
 * Notification Service
 * 通知中心
 */
Bilibili.Services.factory('Notification', function() {

    var self = {};

    self.send = function(message) {

        if (!message) {
            return false;
        }

        var notification = webkitNotifications.createNotification('icon.png', Bilibili.config.name, message.text);

        notification.onclick = function() {
            chrome.tabs.create({url: message.link});
        };
        notification.show();

        // 10秒关闭
        _.delay(function(notification) {
            notification.close();
        }, Bilibili.config.timer.notification, notification);
    }

    return self;
});

/**
 * Icon Service
 * 小图标显示控制
 */
Bilibili.Services.factory('Icon', ['Database', function(Database) {

    var self = {};

    self.setNumber = function(number) {
        var text = '';
        if (number > 10) {
            text = "10+"
        } else if (number > 0) {
            text = number.toString();
        }
        Database.set('unread', number);

        chrome.browserAction.setBadgeText({text: text});
    };

    self.getNumber = function() {
        return Database.get('unread') || 0;
    };

    return self;
}]);

/**
 * list Controller
 * 结果列表页
 */
Bilibili.App.controller('list', ['$scope', 'Database', 'RSS', 'Icon',
    function($scope, Database, RSS, Icon) {

        var __markAsRead = function(list) {
            var read = Database.get('read') || [];
            _.each(list, function(item) {
                if (!_.findWhere(read, {link: item.link})) {
                    read.push(item);
                }
                if (read.length > 50) {
                    read.pop();
                }
            });
            Database.set('read', read);
        };

        $scope.title = '新番组';

        var rss = RSS.parse(Database.get('rss')) || {};
        __markAsRead(rss.follow);
        angular.extend($scope, rss);

        // 重新下载列表
        RSS.download(Bilibili.config.rss).then(function(data) {
            Database.set('rss', data.xml);
            __markAsRead(data.list.follow);
            angular.extend($scope, data.list);
        });

        // 未读数清零
        Icon.setNumber(0);
    }]);

/**
 * option Controller
 * 关键词配置页
 */
Bilibili.App.controller('option', ['$scope', 'Database',
    function($scope, Database) {

        var __generateKey = function() {
            return (Date.now() + Math.random()).toString(36);
        };

        $scope.keywords = Database.get('keywords') || [
            {id: __generateKey(), word: '凉宫春日'},
            {id: __generateKey(), word: '澄空'}
        ];

        $scope.addKeyword = function() {
            var data = {
                id: __generateKey(),
                word: ''
            };
            $scope.keywords.push(data);
        };

        $scope.removeKeyword = function(id) {
            _.remove($scope.keywords, function(keyword) {
                return keyword.id == id;
            });
        };

        $scope.save = function() {

            // 排除空值
            var keywords = _.filter($scope.keywords, function(keyword) {
                return _.isString(keyword.word) && keyword.word.length > 0;
            });

            Database.set('keywords', keywords);
            alert('保存成功');
        };
    }]);

Bilibili.App.controller('background', ['$interval', 'Database', 'Notification', 'Icon', 'RSS',
    function($interval, Database, Notification, Icon, RSS) {

        var __getUnnotifiedList = function(list) {
            var unnotified = [];
            var notified = Database.get('notified') || [];
            var read = Database.get('read') || [];

            _.each(list, function(item) {
                if (!_.findWhere(notified, {link: item.link}) && !_.findWhere(read, {link: item.link})) {
                    unnotified.push(item);
                    notified.push(item);
                }
                if (notified.length > 50) {
                    notified.pop();
                }
            });
            Database.set('notified', notified);

            return unnotified;
        };

        var __createMessage = function(unnotified) {
            var message = {};
            var template = '';

            if (!unnotified.length) {
                return false;
            }

            if (unnotified.length == 1) {
                message.text = Bilibili.config.message.one.replace('{{title}}', unnotified[0].title);
                message.link = unnotified[0].link;
            }

            if (unnotified.length > 1) {
                message.text = Bilibili.config.message.multi.replace('{{number}}', unnotified.length);
                message.link = Bilibili.config.web;
            }

            return message;
        };

        var __exec = function() {
            var read = Database.get('read') || {};

            RSS.download(Bilibili.config.rss).then(function(data) {
                Database.set('rss', data.xml);
                var unnotified = __getUnnotifiedList(data.list.follow);
                Notification.send(__createMessage(unnotified));
                Icon.setNumber(Icon.getNumber() + unnotified.length);
            });
        };

        $interval(__exec, Bilibili.config.timer.background);
    }]);