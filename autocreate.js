/*
 * Copyright (c) 2016 Simon Schoenenberger
 * https://github.com/detomon/autocreate.js
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function(window, document, $) {
'use strict';

var dataValues = {};
var keyIndex = 0;
var time = new Date().getTime();
var key = 'ac' + time;
var initialized = false;

function data(element, value) {
	if (value === undefined) {
		value = dataValues[element.dataset[key]];
	}
	else {
		var index = element.dataset[key];

		if (index === undefined) {
			index = element.dataset[key] = (Math.random() * 1e9) + '_' + (keyIndex ++);
			keyIndex %= 1e9;
		}

		dataValues[index] = value;
	}

	return value;
}

function createParentContext(parent) {
	var context = parent[key];

	if (!context) {
		context = parent[key] = {
			modules: {},
		};

		parent.addEventListener('DOMNodeInserted', function (e) {
			var target = e.target;

			if (target.nodeType == Node.ELEMENT_NODE) {
				handleContext(this[key], target.parentNode);
			}
		});
	}

	return context;
}

function createElementContext(element) {
	var context = data(element);

	if (!context) {
		context = data(element, {
			data: {},
		});
	}

	return context;
}

function handleModule(module, parent) {
	var elements = parent.querySelectorAll(module.query);

	for (var j = 0; j < elements.length; j ++) {
		var element = elements[j];
		var context = createElementContext(element);

		if (!context.data[module.id]) {
			var object = {
				_module: module,
			};
			context.data[module.id] = object;
			module.create.call(object, element);
		}
	}
}

function handleContext(context, parent) {
	var modules = context.modules;

	for (var i in modules) {
		if (modules.hasOwnProperty(i)) {
			var module = modules[i];
			handleModule(module, parent);
		}
	}
}

function destroyElements(elements) {
	for (var i = 0; i < elements.length; i ++) {
		var element = elements[i];
		var context = data(element);
		var modules = context.data;

		for (var i in modules) {
			if (modules.hasOwnProperty(i)) {
				var module = modules[i]._module;
				module.destroy.call(context.data[i], element);
			}
		}
	}
}

function init(dom) {
	if (!initialized) {
		initialized = true;

		dom.addEventListener('DOMNodeRemoved', function (e) {
			var target = e.target;

			if (target.nodeType == Node.ELEMENT_NODE) {
				var elements = target.querySelectorAll('[data-' + key + ']');
				destroyElements(elements);

				if (data(target)) {
					destroyElements([target]);
				}
			}
		});
	}
}

function autocreate(options) {
	var dom = document.documentElement;
	var query = options.selector;
	var parent = options.parent ? options.parent : dom;
	var context = createParentContext(parent);
	var id = Math.random() * 1e9;

	if (!query) {
		throw new Error('Query cannot be empty');
	}

	var module = context.modules[id] = {
		id: id,
		query: query,
		create: options.create || function () {},
		destroy: options.destroy || function () {},
	};

	init(dom);

	handleModule(module, parent);
}

window.autocreate = autocreate;

if ($) {
	$.fn.autocreate = function (options) {
		return this.each(function () {
			options = $.extend(options, {
				parent: this,
			});

			autocreate(options);
		});
	};
}

}(window, document, window.jQuery || window.u));
