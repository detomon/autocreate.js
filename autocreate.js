/*
 * Copyright (c) 2017 Simon Schoenenberger
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

;(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		define([], factory);
	}
	else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	}
	else {
		root.autocreate = factory();
	}
}(this, function () {
	'use strict';

	/**
	 * Random data attribute name.
	 */
	var key = 'ac' + randomString();

	/**
	 * Data attribute name.
	 */
	var dataKey = 'data-' + key;

	/**
	 * Data attribute selector.
	 */
	var dataSelector = '[' + dataKey + ']';

	/**
	 * The topmost DOM element.
	 */
	var dom = document.documentElement;

	/**
	 * The DOM MutationObserver watching for removed nodes.
	 */
	var domObserver;

	/**
	 * Element prototype.
	 */
	var elementPrototype = Element.prototype;

	/**
	 * Element matches method.
	 */
	var elementMatches = elementPrototype.matches
			|| elementPrototype.matchesSelector
			|| elementPrototype.msMatchesSelector
			|| elementPrototype.mozMatchesSelector
			|| elementPrototype.webkitMatchesSelector
			|| elementPrototype.oMatchesSelector;

	/**
	 * Create random string.
	 *
	 * @return String
	 */
	function randomString() {
		return Math.random().toString(36).substring(2, 12);
	}

	/**
	 * Make unique list by removing duplicate items.
	 *
	 * @param Array array A list of arbitary items.
	 * @return Array A list with unique elements.
	 */
	function arrayUnique(array) {
		return array.sort().reduce(function (list, value) {
			if (list[list.length - 1] !== value) {
				list.push(value);
			}

			return list;
		}, []);
	}

 	/**
 	 * Loop over given NodeList.
	 *
	 * @param NodeList A node list.
	 * @param Function func A callback function.
 	 */
	function forEachNode(nodes, func) {
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];

			if (node.nodeType === Node.ELEMENT_NODE) {
				func(node);
			}
		}
	}

	/**
	 * Throw error with given string.
	 */
	function error(string) {
		throw new Error(string);
	}

	/**
	 * Get or create element context.
	 *
	 * @param Element element A DOM element.
	 * @return Object The element context.
	 */
	function elementContext(element) {
		var ctx = element[key];

		if (!ctx) {
			ctx = element[key] = new Context(element);
		}

		return ctx;
	};

	/**
	 * Initialize DOM observer.
	 */
	function init() {
		if (domObserver) {
			return;
		}

		domObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				forEachNode(mutation.removedNodes, function (element) {
					var elements = element.querySelectorAll(dataSelector);

					forEachNode(elements, function (element) {
						var ctx = elementContext(element);

						if (ctx) {
							ctx.destroy();
						}
					});

					var ctx = elementContext(element);

					if (ctx) {
						ctx.destroy();
					}
				});
			});

			// TODO: removing delayed
		});

		domObserver.observe(dom, {childList: true, subtree: true});
	}

	/**
	 * Construct Module.
	 *
	 * @param Object options The module options:
	 *     String selector: A selector (e.g. `.wrapper .module`).
	 *     Function create: A create callback `function (element) {}`.
	 *     Function destroy: An optional destroy callback `function (element) {}`.
	 *     Array parents: An optional list of parents.
	 */
	var Module = function (options) {
		options = options || {};

		var selector = options.selector || error('Selector cannot be empty');
		var parents = options.parents || dom;

		// convert to array if not array-like object
		if (parents.length === undefined) {
			parents = [parents];
		}

		parents = arrayUnique(parents);

		this.id = randomString();
		this.selector = selector;
		this.parents = parents;
		this.createElement = options.create || function () {};
		this.destroyElement = options.destroy || function () {};
		this.destroyDelayed = !!options.destroyDelayed;
		this.elements = {};

		this.parents.forEach(function (parent) {
			elementContext(parent).addModule(this);
			this.createAll(parent);
		}.bind(this));
	}

	/**
	 * Create instance for given element.
	 *
	 * @param Element element A DOM element.
	 */
	Module.prototype.create = function (element) {
		var moduleId = this.id;
		var ctx = elementContext(element);
		var data = ctx.data;

		if (!data[moduleId]) {
			var moduleCtx = data[moduleId] = {
				module: this,
				userCtx: {},
			};
			var userCtx = moduleCtx.userCtx;

			this.elements[ctx.id] = element;
			this.createElement.call(userCtx, element, userCtx);
		}
	};

	/**
	 * Destroy module and call destroy callback for every matching element.
	 */
	Module.prototype.destroy = function () {
		var moduleId = this.id;
		var elements = this.elements;
		var parents = this.parents;
		var destroy = this.destroyElement;

		for (var i in elements) {
			if (elements.hasOwnProperty(i)) {
				var element = elements[i];
				var ctx = elementContext(element);

				ctx.removeModule(this);
			}
		}

		for (var i in parents) {
			if (parents.hasOwnProperty(i)) {
				var parent = parents[i];
				var ctx = elementContext(parent);

				ctx.removeModule(this);
			}
		}

		this.elements = {};
		this.parents = [];
	};

	/**
	 * Create instances for target element and matching child elements.
	 *
	 * @param Element target A DOM element.
	 */
	Module.prototype.createAll = function (target) {
		var self = this;
		var selector = this.selector;

		if (elementMatches.call(target, selector)) {
			self.create(target);
		}

		forEachNode(target.querySelectorAll(selector), function (element) {
			self.create(element);
		});
	};

	/**
	 * Construct element Context.
	 *
	 * @param Element element A DOM element.
	 */
	var Context = function (element) {
		this.id = randomString();
		this.data = {};
		this.element = element;
		element.setAttribute(dataKey, '');
	};

	/**
	 * Add MutationObserver to context.
	 */
	Context.prototype.addObserver = function () {
		if (!this.observer) {
			var self = this;
			var observer = new MutationObserver(function (mutations) {
				mutations.forEach(function (mutation) {
					forEachNode(mutation.addedNodes, function (element) {
						self.createAll(element);
					});
				});
			});

			this.modules = {};
			this.observer = observer;
			observer.observe(this.element, {childList: true, subtree: true});
		}
	};

	/**
	 * Remove MutationObserver from context.
	 */
	Context.prototype.removeObserver = function () {
		if (this.observer) {
			this.observer.disconnect();
			delete this.modules;
			delete this.observer;
		}
	};

	/**
	 * Add module.
	 *
	 * @param Module module The module to add to the context.
	 */
	Context.prototype.addModule = function (module) {
		this.addObserver();
		this.modules[module.id] = module;
	};

	/**
	 * Remove module.
	 *
	 * @param Module module The module to remove from the context.
	 */
	Context.prototype.removeModule = function (module) {
		var moduleId = module.id;
		var element = this.element;
		var data = this.data;
		var modules = this.modules;
		var modulesLength = 0;

		if (data[moduleId]) {
			var userCtx = data[moduleId].userCtx;

			module.destroyElement.call(userCtx, element, userCtx);
			delete data[moduleId];
		}

		if (modules) {
			delete modules[moduleId];
			modulesLength = Object.keys(modules).length;
		}

		if (!modulesLength) {
			this.removeObserver();

			if (!Object.keys(data).length) {
				this.destroy();
			}
		}
	};

	/**
	 * Create instances for target element and matching child elements.
	 *
	 * @param Element target A DOM element.
	 */
	Context.prototype.createAll = function (target) {
		var modules = this.modules;

		for (var i in modules) {
			if (modules.hasOwnProperty(i)) {
				modules[i].createAll(target);
			}
		}
	};

	/**
	 * Destroy context.
	 */
	Context.prototype.destroy = function () {
		var element = this.element;
		var data = this.data;

		// before element destruction call to prevent possible recursion
		this.removeObserver();

		for (var i in data) {
			if (data.hasOwnProperty(i)) {
				var moduleCtx = data[i];
				var userCtx = moduleCtx.userCtx;

				moduleCtx.module.destroyElement.call(userCtx, element, userCtx);
			}
		}

		element.removeAttribute(dataKey);
		delete element[key];
	};

	/**
	 * Create instance of Module.
	 *
	 * @param Object options Options for Module constructor.
	 * @return Module
	 */
	function autocreate(options) {
		init();

		return new Module(options);
	}

	var $ = window.jQuery || window.ujs;

	// Define jQuery or u.js plugin function if present
	if ($) {
		$.fn.autocreate = function (options) {
			options = options || {};
			options.parents = this;

			return autocreate(options);
		};
	}

	return autocreate;
}));
