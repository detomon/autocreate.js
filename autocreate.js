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
var key = 'ac' + new Date().getTime();
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

function createContext(element) {
	var context = data(element);

	if (!context) {
		context = data(element, {
			modules: {},
			data: {},
			element: element,
		});

		element.addEventListener('DOMNodeInserted', function (e) {
			var target = e.target;

			if (target.nodeType == Node.ELEMENT_NODE) {
				handleContext(data(this), target.parentNode);
			}
		});
	}

	return context;
}

function handleModule(context, module, parent) {
	var elements = parent.querySelectorAll(module.query);

	for (var j = 0; j < elements.length; j ++) {
		var element = elements[j];
		var elementContext = createContext(element);

		if (!elementContext.data[module.id]) {
			var object = {};
			elementContext.modules[module.id] = module;
			elementContext.data[module.id] = object;
			module.create.call(object, element);
		}
	}
}

function handleContext(context, parent) {
	var modules = context.modules;

	for (var i in modules) {
		if (modules.hasOwnProperty(i)) {
			var module = modules[i];
			handleModule(context, module, parent);
		}
	}
}

function destroyElements(elements) {
	for (var i = 0; i < elements.length; i ++) {
		var element = elements[i];
		var context = data(element);
		var modules = context.modules;

		for (var i in modules) {
			if (modules.hasOwnProperty(i)) {
				var module = modules[i];
				module.destroy.call(context.data[i], element);
			}
		}
	}
}

function autocreate(options) {
	var dom = document.documentElement;
	var query = options.selector;
	var parent = options.parent ? options.parent : dom;
	var context = createContext(parent);
	var modules = context.modules;

	if (!query) {
		throw new Error('Query cannot be empty');
	}

	options.create = options.create || function () {};
	options.destroy = options.destroy || function () {};

	var id = Math.random() * 1e9;
	var module = modules[id] = {
		query: query,
		create: options.create,
		destroy: options.destroy,
		id: id,
	};

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

	handleModule(context, module, parent);
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
