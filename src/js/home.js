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
 
$(function(){
	chrome.storage.sync.get('config', function(data) {
		var model = new Model({rss: Bilibili.rss, config: data.config}),
			view = new View(model),
			controller = new Controller(model, view);
		controller.home();
	});
});