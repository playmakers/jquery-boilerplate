# Shopify Visual Variant Selector

## TODO
	- [x] hide if only one option
	- [x] pre-define variant states: sale, unavailable, soldout...
	- [ ] tests?
  - [ ] edgcases: more option value than defined?


## Usage

1. Include jQuery:

	```html
	<script src="http://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js"></script>
	```

2. Include plugin's code:

	```html
	<script src="dist/jquery.shopifyVisualVariantSelector.min.js"></script>
	```

3. Call the plugin:

	```javascript
		$("#element")
      .shopifyVisualVariantSelector({
        hideSingleOptionsFromLevel: false,
        resolveAvailabilityConflict: false,
        selectSoldOut: false
	     })
	     .on('variantChange', function(event, variant){
	     	  // do something with selected variant
	     });
	```


This jQuery Plugin is based on [jquery-boilerplate](https://github.com/jquery-boilerplate/boilerplate)
