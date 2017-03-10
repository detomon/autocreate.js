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
	 * Value objects for data attributes.
	 */
	var dataValues = {};

	/**
	 * Incrementing key index to ensure uniqueness of element key.
	 */
	var keyIndex = 0;

	/**
	 * Random data attribute name.
	 */
	var key = 'ac' + rand();

	/**
	 * The topmost DOM element.
	 */
	var dom = document.documentElement;

	/**
	 * The DOM MutationObserver watching for removed nodes.
	 */
	var domObserver;

	/**
	 * A list of removed nodes for delayed deletion.
	 */
	var removedElements = [];

	/**
	 * Timeout for delayed deletion.
	 */
	var removedTimeout;

	/**
	 * Create random string.
	 *
	 * @return String
	 */
	function rand() {
		var r = Math.random;

		return ((((1 + r()) * 0x100000)) | 0) + '' + ((((1 + r()) * 0x100000)) | 0);
	}

	/**
	 * Make list unique by removing duplicate items.
	 *
	 * @param Array array A list of arbitary items.
	 * @return Array A list with unique elements.
	 */
	function unique(array) {
		return array.sort().reduce(function (list, value) {
			if (list[list.length - 1] !== value) {
				list.push(value);
			}

			return list;
		}, []);
	}

	/**
	 * Get or set data object fo given element.
	 *
	 * @param Node element A DOM node.
	 * @param Object value A value object.
	 * @return Object The value object.
	 */
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

	/**
	 * Unset data value for given element in global list.
	 *
	 * @param Node element A DOM node.
	 */
	function unsetData(element) {
		delete dataValues[element.dataset[key]];
	}

 	/**
 	 * Loop over given NodeList.
	 *
	 * @param NodeList A node list.
	 * @param Function func A callback function.
 	 */
	function forEachNode(nodes, func) {
		for (var i = 0; i < nodes.length; i ++) {
			var node = nodes[i];

			if (node.nodeType === Node.ELEMENT_NODE) {
				func(node);
			}
		}
	}

	/**
	 * Get observer context object for given node.
	 *
	 * @param Node A DOM node.
	 * @return Object The context object.
	 */
	function observerCtx(parent) {
		var ctx = parent[key];

		if (!ctx) {
			var observer = new MutationObserver(function (mutations) {
				mutations.forEach(function (mutation) {
					forEachNode(mutation.addedNodes, function (node) {
						handleCtx(ctx, parent, node);
					});
				});
			});

			ctx = parent[key] = {
				modules: {},
				observer: observer,
			};

			observer.observe(parent, {childList: true, subtree: true});
		}

		return ctx;
	}

	/**
	 * Get element context object for given node.
	 *
	 * @param Node A DOME node.
	 * @return Object The context object.
	 */
	function elementCtx(element) {
		var ctx = data(element);

		if (!ctx) {
			ctx = data(element, {
				data: {},
			});
		}

		return ctx;
	}

	/**
	 * Call different versions of Node's matches method.
	 *
	 * @param Node A DOM node.
	 * @param String The selector to match.
	 * @return bool
	 */
	function matches(element, selector) {
		var m = element.matches
			|| element.matchesSelector
			|| element.msMatchesSelector
			|| element.mozMatchesSelector
			|| element.webkitMatchesSelector
			|| element.oMatchesSelector
			|| function () {
				return [].indexOf.call(document.querySelectorAll(selector), element) !== -1;
			};

		return m.call(element, selector);
	}

	/**
	 * Handle module instance for given element.
	 *
	 * @param AutoCreate modules The module instance to create.
	 * @param Node parent The parent node for the created node.
	 * @param Node target The created element.
	 */
	function handleModule(module, parent, target) {
		var allElements = [];

		if (target) {
			if (matches(target, module.selector)) {
				allElements.push(target);
			}

			forEachNode(target.querySelectorAll(module.selector), function (node) {
				allElements.push(node);
			});
		}
		else {
			forEachNode(parent.querySelectorAll(module.selector), function (node) {
				allElements.push(node);
			});
		}

		allElements.forEach(function (element) {
			var ctx = elementCtx(element);

			if (!ctx.data[module.id]) {
				var object = ctx.data[module.id] = {
					_module: module,
				};

				module.elements[ctx._id] = element;
				module.createCtx.call(object, element);
			}
		});
	}

	/**
	 * Handle all module instances for given element.
	 *
	 * @param Object ctx The observer context.
	 * @param Node parent The parent node for the created node.
	 * @param Node target The created element.
	 */
	function handleCtx(ctx, parent, target) {
		var modules = ctx.modules;

		for (var i in modules) {
			if (modules.hasOwnProperty(i)) {
				var module = modules[i];

				handleModule(module, parent, target);
			}
		}
	}

	/**
	 * Destroy element with a given module.
	 *
	 * @param Node element A DOM element to destroy.
	 * @param AutoCreate The modules to destroy the element for.
	 * @param Object The node context.
	 */
	function destroyElementModule(element, module, ctx) {
		var moduleData = module;
		var module = moduleData._module;

		module.destroyCtx.call(moduleData, element);
		delete module.elements[ctx._id];
	}

	/**
	 * Destroy single node.
	 *
	 * @param Node element A DOM element to destroy.
	 * @param boolean delayed If the element should be removed immediately.
	 */
	function destroyElement(element, delayed) {
		var ctx = data(element);

		if (ctx) {
			var success = false;
			var modules = ctx.data;

			for (var i in modules) {
				if (modules.hasOwnProperty(i)) {
					var module = modules[i];

					if (module._module.destroyDelayed === delayed) {
						destroyElementModule(element, module, ctx);
						success = true;
					}
				}
			}

			if (success) {
				unsetData(element);
			}
		}
	}

	/**
	 * Remove nodes.
	 *
	 * @param Array elements A list of elements to remove.
	 * @param boolean If the elements should be removed immediately.
	 */
	function destroyElements(elements, delayed) {
		elements.forEach(function (element) {
			destroyElement(element, delayed);
		});
	}

	/**
	 * Throw error with given string.
	 */
	function error(string) {
		throw new Error(string);
	}

	/**
	 * Remove nodes pushed to the delayed removing list.
	 */
	function removeDelayed() {
		if (removedTimeout) {
			clearTimeout(removedTimeout);
		}

		removedTimeout = setTimeout(function () {
			var elements = removedElements.filter(function (element) {
				for (var parent = element; parent.parentNode;) {
					parent = parent.parentNode;
				}

				return parent !== element.ownerDocument;
			});

			// may be filled again by destructors
			removedElements = [];
			destroyElements(elements, true);
		}, 0);
	}

	/**
	 * Initialize DOM observer.
	 */
	function init() {
		domObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				forEachNode(mutation.removedNodes, function (node) {
					var elements = node.querySelectorAll('[data-' + key + ']');

					forEachNode(elements, function (element) {
						var ctx = data(element);

						if (ctx) {
							destroyElement(element, false);
							removedElements.push(element);
						}
					});

					var ctx = data(node);

					if (ctx) {
						destroyElement(node, false);
						removedElements.push(node);
					}
				});
			});

			removeDelayed();
		});

		domObserver.observe(dom, {childList: true, subtree: true});
	}

	/**
	 * AutoCreate module.
	 *
	 * @param Object options:
	 *   selector: Element selector (string).
	 *   parents: Single element or array of parents to observe (optional).
	 *   create: The function to be called when an element is created.
	 *   destroy: The function to be called when the element is removed from the DOM (optional).
	 *   destroyDelayed: Does not destroy elements moved to other parent elements (optional).
	 */
	function AutoCreate(options) {
		var selector = options.selector || error('Selector cannot be empty');
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
		this.destroyDelayed = !!options.destroyDelayed;
		this.elements = {};

		for (var i = 0; i < parents.length; i ++) {
			var ctx = observerCtx(parents[i]);
			ctx.modules[this.id] = this;
			ctx.options = options;
		}
	}

	/**
	 * Get context form given node.
	 *
	 * @param Node element A DOM element.
	 * @return Object The context.
	 */
	AutoCreate.prototype.ctxFromElement = function (element) {
		var ctx = data(element);

		if (ctx) {
			return ctx.data[this.id];
		}
	};

	/**
	 * Destroy module instances and remove observers.
	 */
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

	/**
	 * Handle initial modules.
	 */
	AutoCreate.prototype.handleModules = function () {
		this.parents.forEach(function (parent) {
			handleModule(this, parent);
		}.bind(this));
	}

	/**
	 * Create new autocreate module and return instance.
	 *
	 * @param Object options Options for the AutoCreate class.
	 * @return AutoCreate The autocreate module instance.
	 */
	function autocreate(options) {
		var instance = new AutoCreate(options);

		instance.handleModules();

		return instance;
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

	init();

	return autocreate;
}));
