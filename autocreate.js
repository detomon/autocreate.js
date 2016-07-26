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
var key = 'ac' + rand();
var initialized = false;
var dom = document.documentElement;
var removedElements = [];
var removedTimeout;

function rand() {
	var r = Math.random;

	return ((((1 + r()) * 0x100000)) | 0) + '' + ((((1 + r()) * 0x100000)) | 0);
}

function unique(array) {
	return array.sort().reduce(function (list, value) {
		if (list[list.length - 1] !== value) {
			list.push(value);
		}

		return list;
	}, []);
}

function data(element, value) {
	if (value === undefined) {
		value = dataValues[element.dataset[key]];
	}
	else {
		var index = element.dataset[key];

		if (index === undefined) {
			index = element.dataset[key] = rand() + (keyIndex ++);
			keyIndex %= 0x100000000;
		}

		value._id = rand();
		dataValues[index] = value;
	}

	return value;
}

function unsetData(element) {
	delete dataValues[element.dataset[key]];
}

function observerCtx(parent) {
	var ctx = parent[key];

	if (!ctx) {
		ctx = parent[key] = {
			modules: {},
		};

		parent.addEventListener('DOMNodeInserted', function (e) {
			var target = e.target;

			if (target.nodeType === Node.ELEMENT_NODE) {
				handleCtx(this[key], target.parentNode);
			}
		});
	}

	return ctx;
}

function elementCtx(element) {
	var ctx = data(element);

	if (!ctx) {
		ctx = data(element, {
			data: {},
		});
	}

	return ctx;
}

function handleModule(module, parent) {
	var elements = parent.querySelectorAll(module.selector);

	for (var j = 0; j < elements.length; j ++) {
		var element = elements[j];
		var ctx = elementCtx(element);

		if (!ctx.data[module.id]) {
			var object = ctx.data[module.id] = {
				_module: module,
			};
			module.elements[ctx._id] = element;
			module.createCtx.call(object, element);
		}
	}
}

function handleCtx(ctx, parent) {
	var modules = ctx.modules;

	for (var i in modules) {
		if (modules.hasOwnProperty(i)) {
			var module = modules[i];
			handleModule(module, parent);
		}
	}
}

function destroyElementModule(element, module, ctx) {
	var moduleData = module;
	var module = moduleData._module;

	module.destroyCtx.call(moduleData, element);
	delete module.elements[ctx._id];
}

function destroyElement(element) {
	var ctx = data(element);
	var modules = ctx.data;

	for (var i in modules) {
		if (modules.hasOwnProperty(i)) {
			var module = modules[i];
			destroyElementModule(element, module, ctx);
		}
	}

	unsetData(element);
}

function destroyElements(elements) {
	for (var i = 0; i < elements.length; i ++) {
		destroyElement(elements[i]);
	}
}

function error(string) {
	throw new Error(string);
}

function removeDelayed() {
	if (removedTimeout) {
		clearTimeout(removedTimeout);
	}

	removedTimeout = setTimeout(function () {
		var element = removedElements.filter(function (element) {
			return !element.parentNode;
		});

		// may be filled again by destructors
		removedElements = [];
		destroyElements(element);
	}, 0);
}

function init() {
	if (!initialized) {
		initialized = true;

		dom.addEventListener('DOMNodeRemoved', function (e) {
			var target = e.target;

			if (target.nodeType === Node.ELEMENT_NODE) {
				var elements = target.querySelectorAll('[data-' + key + ']');

				for (var i = 0; i < elements.length; i ++) {
					removedElements.push(elements[i]);
				}

				if (data(target)) {
					removedElements.push(target);
				}

				removeDelayed();
			}
		});
	}
}

function AutoCreate(options) {
	var selector = options.selector || error('Query cannot be empty');
	var parents = options.parents || dom;

	// convert to array if not array-like object
	if (parents.length === undefined) {
		parents = [parents];
	}

	parents = unique(parents);

	this.id = rand();
	this.parents = parents;
	this.selector = selector;
	this.createCtx = options.create || function () {};
	this.destroyCtx = options.destroy || function () {};
	this.elements = {};

	for (var i = 0; i < parents.length; i ++) {
		var ctx = observerCtx(parents[i]);
		ctx.modules[this.id] = this;
	}
}

AutoCreate.prototype.ctxFromElement = function (element) {
	var ctx = data(element);

	if (ctx) {
		return ctx.data[this.id];
	}
};

AutoCreate.prototype.destroy = function () {
	var parents = this.parents;
	var elements = this.elements;

	for (var i = 0; i < parents.length; i ++) {
		var ctx = observerCtx(parents[i]);

		for (var i in elements) {
			if (elements.hasOwnProperty(i)) {
				destroyElementModule(elements[i], this, ctx);
			}
		}

		delete ctx.modules[this.id];
	}
};

function autocreate(options) {
	init();

	var instance = new AutoCreate(options);
	var parents = instance.parents;

	for (var i = 0; i < parents.length; i ++) {
		handleModule(instance, parents[i]);
	}

	return instance;
}

window.autocreate = autocreate;

if ($) {
	$.fn.autocreate = function (options) {
		var parents = [];

		for (var i = 0; i < this.length; i ++) {
			parents.push(this[i]);
		}

		options = $.extend(options, {
			parents: parents,
		});

		return autocreate(options);
	};
}

}(window, document, window.jQuery || window.u));
