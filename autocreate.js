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

var inited = false;
var key = '_ac' + new Date().getTime();

function handleContext(context, parent) {
	var queries = context.queries;

	for (var query in queries) {
		if (queries.hasOwnProperty(query)) {
			var modules = queries[query];

			for (var i = 0; i < modules.length; i ++) {
				var module = modules[i];
				var elements = parent.querySelectorAll(query);

				for (var j = 0; j < elements.length; j ++) {
					var element = elements[j];
					var elementContext = createContext(element);

					if (!elementContext.done[context.id]) {
						elementContext.done[context.id] = true;
						elementContext.modules.push(module);
						module.create.call(elementContext, element);
					}
				}
			}
		}
	}
}

function createContext(element) {
	if (!element[key]) {
		element[key] = {
			queries: {},
			modules: [],
			done: {},
			element: element,
			id: (Math.random() * 1e9).toString(),
		};

		element.addEventListener('DOMNodeInserted', function (e) {
			handleContext(this[key], e.target.parentNode);
		});
	}

	return element[key];
}

function destroyTree(element) {
	var context = element[key];

	if (context) {
		var modules = context.modules;

		for (var i = 0; i < modules.length; i ++) {
			var module = modules[i];
			module.destroy.call(context, element);
		}
	}

	for (var child = element.firstChild; child; child = child.nextSibling) {
		destroyTree(child);
	}
}

function autocreate(options) {
	var dom = document.documentElement;
	var query = options.selector;
	var parent = options.parent ? options.parent : dom;
	var context = createContext(parent);
	var queries = context.queries;

	if (!query) {
		throw new Error('Query cannot be empty');
	}

	options.create = options.create || function () {};
	options.destroy = options.destroy || function () {};
	queries[query] = queries[query] || [];

	queries[query].push({
		create: options.create,
		destroy: options.destroy,
	});

	if (!inited) {
		inited = true;

		dom.addEventListener('DOMNodeRemoved', function (e) {
			destroyTree(e.target);
		});
	}

	handleContext(context, parent);
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
