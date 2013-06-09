/**
 * Copyright 2013 7lemon (https://github.com/7lemon)
 *
 * This file is part of Bilibili-bangumi-chrome-extension
 * 
 * Bilibili-bangumi-chrome-extension is free software: you can 
 * redistribute it and/or modify it under the terms of the GNU General 
 * Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 * 
 * Bilibili-bangumi-chrome-extension is distributed in the hope that
 * it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with Bilibili-bangumi-chrome-extension. If not, see <http://www.gnu.org/licenses/>.
 */

function Cron(model) {
	this._model = model;
	this._interval = 1000 * 300;
}

Cron.prototype.parse = function(xmlDoc) {
	var data = this._model.parseXML(xmlDoc),
		records = this._model.getRecords(),
		notifyCount = 0,
		title = '', link = '';
	if (data.follow.length > 0) {
		for (var i = 0; i < data.follow.length; i++) {
			if (records.read.indexOf(data.follow[i].link) < 0 && records.unread.indexOf(data.follow[i].link) < 0) {
				records.unread.push(data.follow[i].link);
				title = data.follow[i].title;
				link = data.follow[i].link;
				notifyCount++;
			}
		}
		this._model.setRecords(records);
		this._model.setUpdateNumber(records.unread.length);

		var message = null, tabUrl = null;
		if (notifyCount == 1) {
			message = Bilibili.message.one.replace('{%title%}', title);
			tabUrl = link;
		} else if (notifyCount > 1) {
			message = Bilibili.message.multi.replace('{%number%}', notifyCount);
			tabUrl = Bilibili.web;
		}

		if (message) {
			var notification = webkitNotifications.createNotification('icon.png', Bilibili.name, message);
			notification.onclick = function() {
				chrome.tabs.create({url: tabUrl});
			};
			notification.show();
		}
	}
}

Cron.prototype.initLocalStorage = function() {
	records = this._model.getRecords();
}

Cron.prototype.run = function() {
	var _this = this;
	this.initLocalStorage();
	function exec() {
		_this._model.download(function(){
			_this._model.reloadConfig(function(){
				chrome.storage.local.get('rss', function(data){
					if (data.rss !== undefined) {
						var xml = data.rss;
					} else {
						_this._model.download();
						return false;
					}
					_this.parse(xml);
				});
			});
		});
		setTimeout(exec, _this._interval);
	}
	exec();
}

$(function(){
	chrome.storage.sync.get('config', function(data) {
		var model = new Model({rss: Bilibili.rss, config: data.config}),
			cron = new Cron(model);
		cron.run();
	});
});
