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

var Bilibili = {
	name: 'Bilibili新番组',
	rss: 'http://www.bilibili.tv/rss-13.xml',
	web: 'http://www.bilibili.tv/video/bangumi.html',
	message: {
		one: '{%title%} 上线啦！还不快去撸一发？',
		multi: '发现 {%number%} 个新番，不去瞧瞧吗？'
	}
}

function Model(data) {
	this._rss = data.rss;
	this._config = data.config || {};
	this._xml = '';

	// init config sync storage
	if (this._config === {}) {
 		this.setConfig(this._config);
 	}
}

Model.prototype.download = function(callback) {
	var req = new XMLHttpRequest();
	req.open("GET", this._rss);
	req.onload = function(e) {
		if (callback === undefined) {
			callback = function(){};
		}
		chrome.storage.local.set({'rss': e.target.responseText}, callback);
	};
	req.send();
}

Model.prototype.reloadConfig = function(callback) {
	var _this = this;
	chrome.storage.sync.get('config', function(data){
		_this._config = data.config;
		callback();
	});
}

Model.prototype.setConfig = function(config, callback) {
	if (callback === undefined || typeof callback != 'function') {
		callback = function(){};
	}
	chrome.storage.sync.set({'config': config}, callback);
	this._config = config;
}

Model.prototype.getConfig = function() {
	return this._config;
}

Model.prototype.getRecords = function() {
	if (localStorage["records"] === undefined) {
		this.setRecords({read:[], unread:[]});
	}
	return JSON.parse(localStorage["records"]);
}

Model.prototype.setRecords = function(records) {
	while (records.read.length > 50) {
		records.read.shift();
	}
	localStorage["records"] = JSON.stringify(records);
}

Model.prototype.getKeywords = function() {
	if (this._config.keywords === undefined) {
		this._config.keywords = [];
		this.setConfig(this._config);
	}
	return this._config.keywords;
}

Model.prototype.setKeywords = function(keywords, callback) {
	this._config.keywords = keywords;
	this.setConfig(this._config, callback);
}

Model.prototype.decodeXML_ = function(string) {
	return $('<div />').html(string).text();
}

Model.prototype.followRegExp_ = function() {
	var reg = '',
		keywords = this.getKeywords();
	if (keywords !== undefined) {
		reg = keywords.join("|");
	}

	if (reg.length == 0) {
		reg = '^$';
	}
	return new RegExp(reg, 'i');
}

Model.prototype.parseXML = function(xmlDoc) {
	var _this = this;
		$xml = $($.parseXML(xmlDoc)),
		list = {update:[], follow:[]},
		re = this.followRegExp_();
	$xml.find('item').each(function(){
		var $t = $(this),
			link = $t.find('link').text(),
			title = $t.find('title').text();
		if (title.length > 0) {
			var item = {link: link, title: _this.decodeXML_(title)};
			if (re.test(item.title)) {
				list.follow.push(item);
			} else {
				list.update.push(item);
			}
		}
	});
	return list;
}

Model.prototype.setUpdateNumber = function(number) {
	var text = '';
	if (number > 10) {
		text = "10+"
	} else if (number > 0) {
		text = number.toString();
	}

	chrome.browserAction.setBadgeText({text: text});
}

function View(model) {
	this._model = model;
	this._blocks = {update: $('#update'), follow: $('#follow')};
	this._lists = {update: $('#update-list'), follow: $('#follow-list')};
}

View.prototype.showHome = function(xmlDoc) {
	var data = this._model.parseXML(xmlDoc);
	for (var listName in data) {
		if (data[listName].length > 0) {
			for (var index = 0; index < data[listName].length; index++) {
				var item = data[listName][index],
					html = '<li><a href="' + item.link + '" target="_blank">' + item.title + '</a></li>';
				this._lists[listName].append(html);
			}
			
			this._blocks[listName].fadeIn(800);
		}
	}
	records = this._model.getRecords();
	records.read = records.read.concat(records.unread);
	records.unread = [];
	this._model.setRecords(records);
	this._model.setUpdateNumber(records.unread.length);
}

View.prototype.showSetting = function() {
	var _this = this;
		config = this._model.getConfig(),
		keywordList = this._model.getKeywords().reverse(),
		$list = $('#follow .list');
	$('#follow').click(function(e){
		var $t = $(e.target);
		if ($t.hasClass('del')) {
			var keyword = $t.prev().val();
			    con = true;
			if (keyword.length > 0) {
				con = confirm('确认删除关键字：' + keyword);
			}
			if (con) {
				$t.parent().fadeOut(300, function(e){
					$(this).remove();
				});
			}
		} else if ($t.hasClass('model')) {
			var $keyword = $('#keyword').removeAttr('id'),
				$item = $keyword.clone();
			$item.attr('id', 'keyword');
			$keyword.find('input').removeClass('model');
			$keyword.find('.del').fadeIn(400);
			$list.append($item);
		} else if ($t.attr('id') == 'save') {
			var keywords = [];
			$('#follow-list input[name="key[]"]').each(function(){
				var word = $(this).val();
				if (word.length > 0) {
					keywords.push(word);
				}
			});
			_this._model.setKeywords(keywords, function(){alert('保存成功')});
		}
	});

	var $keyword = $('#keyword');
	for (var i = 0; i < keywordList.length; i++) {
		var $item = $keyword.clone();
		$item.removeAttr('id');
		$item.find('input').removeClass('model');
		$item.find('input').val(keywordList[i]);
		$item.find('.del').show();
		$item.prependTo($list);
	}
}

function Controller(model, view) {
	this._model = model;
	this._view = view;
}

Controller.prototype.home = function() {
	var _this = this;
	chrome.storage.local.get('rss', function(data){
		if (data.rss !== undefined) {
			var xml = data.rss;
		} else {
			return _this._model.download(_this.home);
		}
		_this._view.showHome(xml);
	});
}

Controller.prototype.setting = function() {
	this._view.showSetting();
}
