# autocreate.js

`autocreate.js` provides a small function that watches for the creation of elements matching a given selector. The `create` callback is called for existing and later inserted elements. The `destroy` callback is called whenever the element or one of its ancestors is removed from the DOM.

```html
<div class="page-wrapper">
	<ul class="slideshow">
		<li class="slide">A</li>
		<li class="slide">B</li>
		<li class="slide">C</li>
	</ul>
</div>
```

```js
var module = autocreate({
	// selector of elements to observe
	selector: '.page-wrapper .slideshow',

	// called for existing and inserted elements
	create: function (element) {
		// initialize hypothetical slideshow
		this.slideshow = new Slideshow(element);
	},

	// called whenever the element or one of its ancestors is removed
	destroy: function (element) {
		// destroy slideshow
		this.slideshow.destroy();
	},
});

```

The following will call the `create` callback:

```js
var container = document.createElement('div');

container.innerHTML =
	'<ul class="slideshow">' +
	'	<li class="slide">D</li>' +
	'	<li class="slide">E</li>' +
	'	<li class="slide">F</li>' +
	'</ul>';

document.querySelector('.page-wrapper').appendChild(container);
```

The following will call the `destroy` callback for each `.slideshow` element:

```js
var wrapper = document.querySelector('.page-wrapper');

wrapper.parentNode.removeChild(wrapper);
```

## Options

The `parents` option restricts the search to the given elements. This can be a single element or a collection of elements inside an array or array-like object.

```js

var module = autocreate({
	// selector of element to initialize
	selector: '.element',

	// (optional) match only in given parent element(s)
	parents: document.querySelectorAll('.wrapper'),

	// called for existing and inserted elements
	create: function (element) {
		// ...
	},

	// called when element is removed
	destroy: function (element) {
		// ...
	},
});
```

## Destroying a module

To destroy the module and stop watching for the selector, call the `destroy` method on the returned module instance. This will also call the `destroy` callback for each currently matched element.

```js
module.destroy();
```

## Using with jQuery or u.js

The observer function can also be called using `jQuery` or `u.js`. The following observes the whole document:

```js
var module = $(document).autocreate({
	selector: '.element',
	create: function (element) {
		// ...
	},
	destroy: function (element) {
		// ...
	},
});
```

The following searches only in `.wrapper` elements. This is the same as using the `parents` option.

```js
var module = $('.wrapper').autocreate({
	selector: '.element',
	create: function (element) {
		// ...
	},
	destroy: function (element) {
		// ...
	},
});

```
