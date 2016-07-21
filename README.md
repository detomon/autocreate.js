# autocreate.js

`autocreate.js` is a tiny script that watches for the creation of elements matching a given selector. The `create` callback is called for existing and later inserted elements. The `destroy` callback is called when the element or one of its ancestors is removed from the DOM.

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
autocreate({
	// selector of element(s) to observe
	selector: '.page-wrapper .slideshow',

	// called for existing and inserted elements
	create: function (element) {
		// initialize hypothetical slideshow
		this.slideshow = new Slideshow(element);
	},

	// called when element is removed
	destroy: function (element) {
		// destroy slideshow
		this.slideshow.destroy();
	},
});

```

The following will call the `create` callback:

```js
var slideshow = document.createElement('div');

slideshow.innerHTML =
	'<ul class="slideshow">' +
	'	<li class="slide">D</li>' +
	'	<li class="slide">E</li>' +
	'	<li class="slide">F</li>' +
	'</ul>';

document.querySelector('.page-wrapper').appendChild(slideshow);
```

The following call the `destroy` callback for each `.slideshow` element:

```js
var wrapper = document.querySelector('.page-wrapper');

wrapper.parentNode.removeChild(wrapper);
```

## Options

The `parent` option restricts the matched elements to a given parent element:

```js

autocreate({
	// selector of element to initialize
	selector: '.element',

	// (optional) match only in given parent element
	parent: document.querySelector('.wrapper'),

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
