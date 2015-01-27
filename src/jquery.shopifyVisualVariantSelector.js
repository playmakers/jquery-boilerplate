// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

  "use strict";

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "shopifyVisualVariantSelector",
        defaults = {
          product: $("#product"),
          productPhoto: $("#productPhotoImg"),
          productPrice: $("#productPrice"),
          productComparePrice: $("#comparePrice"),
          options: [null, null, null],
          imageSize: "medium"
        };

    // The actual plugin constructor
    function Plugin ( element, options ) {
        this.element = element;
        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;

        this.variants = {};
        this.defaultVariant = null;

        this.images = [];
        this.optionNames = [];
        this.options = [];

        this.init();

        // $("#productPrice")
        // $("#comparePrice")
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        init: function () {
          var scope = this,
          selector = $(this.element);

          this.optionNames = selector.data("options");

          $.each(this.optionNames, function(index, name){
            scope.options[index] = scope.settings.options[index] || $("<div>").attr("class", name).insertAfter(selector);
          });

          selector.find("option").each(function(index, elem) {
            scope.addVariant($(elem).data("infos"));
          });

          // selector.hide();

          $.each(this.options, function(index, option) {
            option.find("input:first").click();
          });
        },

        addVariant: function(variant) {
          var key = this.variantKey(variant);

          if (!this.defaultVariant || !this.defaultVariant.available) {
            this.defaultVariant = variant;
          }
          this.preload(variant.featured_image);
          this.renderButtons(variant);

          this.variants[key] = variant;
        },

        variantKey: function(variant) {
          var scope = this;
          return $.map(variant.options, function(optionValue) {
            return scope.norm(optionValue);
          }).join("-");
        },

        preload: function(featured_image) {
          if (featured_image) {
            var src = this.imageUrl(featured_image.src);
            if (!this.images[src]) {
              this.images[src] = new Image();
              this.images[src].src = src;
            }
          }
        },

        renderButtons: function(variant) {
          var scope = this;
          $.each(variant.options, function(optionKey, value) {
            var optionValue = scope.norm(value);
            scope.options[optionKey]
              .filter(function() {
                return !$(this).find("input[value=" + optionValue + "]")[0];
              })
              .append(function() {
                return scope.renderButton(optionKey, optionValue, value);
              });
          });
        },

        renderButton: function(optionKey, optionValue, display) {
          var scope = this,
          button = $("<input>")
            .attr("type", "radio")
            .attr("name", "option" + optionKey)
            .val(optionValue),
          name = $("<span>")
            .html(display);

          return $("<label>")
            .attr("class", "optionValue" + optionValue)
            .attr("title", scope.optionNames[optionKey] + ": " + display)
            .append(button, name)
            .on("click", function() {
              $(this).not(".unavailable").not(".active").each(function() {
                scope.toggleClassName($(this), "active")
                  .find("input:radio")
                    .prop("checked", true)
                    .siblings()
                    .prop("checked", false);
                scope.update();
                // scope.setAvailabilites();
              });
            }).on("mouseover", function() {
              $(this).not(".unavailable").not(".active").each(function() {
                scope.toggleClassName($(this), "over");
                scope.update();
              });
            }).on("mouseout", function() {
              $(this).not(".unavailable").not(".active").each(function() {
                $(this).removeClass("over");
                scope.update();
              });
            }).on("availability", function(event, available) {
              $(this)
                .toggleClass("unavailable", !available)
                .toggleClass("disabled", !available)
                .find("input:radio")
                  .attr("disabled", !available);
            }).on("resolveAvailabilityConflict", function() {
              $(this).filter(".active.unavailable").each(function() {
                $(this)
                  .siblings().not(".unavailable").first()
                  .click();
              });
            });
        },

        toggleClassName: function(node, className) {
          return node.addClass(className).siblings().removeClass(className).end();
        },

        update: function() {
          var key = this.currentVariantKey(),
          productElement      = this.settings.product,
          productPhotoElement = this.settings.productPhoto,
          productPrice        = this.settings.productPrice,
          productComparePrice = this.settings.productComparePrice,
          variant = this.variants[key];

          if (variant) {
            $(this.element).val(variant.id);

            if (variant.featured_image && productPhotoElement) {
              productPhotoElement.attr("src", this.imageUrl(variant.featured_image.src));
            }

            productElement.toggleClass("unavailable", variant.quantity < 1 && !variant.available);
            productElement.toggleClass("preorder",    variant.quantity < 1 && variant.available);
            productElement.toggleClass("onsale",      this.onSale(variant));
            productPrice.html(variant.price);
            productComparePrice.html(variant.compare_at_price);
          }
          else {
            productElement.addClass("unavailable");
          }
        },

        currentVariantKey: function() {
          var scope = this;
          return $.map(scope.options, function(option) {
            return $(option.find("label.over input")[0] || option.find("label.active input")[0]).val();
          }).join("-");
        },

        imageUrl: function(url) {
          return url.replace(/\.(jpeg|png|jpg)/g, "_" + this.settings.imageSize + ".$1");
        },

        onSale: function(variant) {
          return (variant.compare_at_price && (variant.price < variant.compare_at_price));
        },

        // ------------------------------------------  sort me

        norm: function(value) {
          return value.replace(/[ .\/]/g, "").replace(/ß/, "s").replace(/ü/, "u");
        },
        // values: function(hash) {
        //   return $.map(hash, function(value, key) {
        //     return value;
        //   });
        // },
        // optionKeys: function() {
        //   return $("#options div").map(function() {
        //     return $(this).first().find("input").attr("name");
        //   });
        // },

        // option: function(optionKey, optionValue) {
        //   var scope = this;
        //   return $('#options .' + optionKey + ' .option').filter(function() {
        //     return $(this).find('input[value=' + scope.norm(optionValue) + ']')[0];
        //   });
        // },

        // setAvailability: function(optionKey, possibleVariants) {
        //   var scope = this,
        //   elements = $('#options .' + optionKey + ' .option'),
        //   sibblingVariants = [];

        //   elements.trigger('availability', false);
        //   sibblingVariants = $.grep(possibleVariants, function(variant) {
        //     return scope.option(optionKey, variant.options[optionKey])
        //       .trigger('availability', variant.available)
        //       .hasClass('active');
        //   });
        //   elements.trigger('resolveAvailabilityConflict');
        //   return sibblingVariants;
        // },

        // setAvailabilites: function() {
        //   var scope = this,
        //   possibleVariants = this.values(variants);

        //   $.each(scope.optionKeys(), function(index, optionKey) {
        //     possibleVariants = scope.setAvailability(optionKey, possibleVariants);
        //   });
        // },

    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function ( options ) {
        return this.each(function() {
            if ( !$.data( this, "plugin_" + pluginName ) ) {
                $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
            }
        });
    };

})( jQuery, window, document );
