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
          // product: null,
          // productPhoto: null,
          // target: null,
          options: [null, null, null],
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
        this.options = [];

        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        init: function () {
          var scope = this,
          selector = $(this.element),
          optionGroupNames = this.settings.optionGroupNames || selector.data("optionGroupNames") || [];

          $.each(optionGroupNames, function(index, optionGroupName) {
            scope.addOption(optionGroupName);
          });

          selector.find("option").each(function(index, elem) {
            var variant;
            if (variant = $(elem).data("variant")) {
              scope.addVariant(variant);
            }
          });

          // selector.hide();
        },

        addOption: function(optionGroupName) {
          var scope = this,
          selector = $(this.element),
          index = scope.options.length,
          elem = $("<div></div>");

          scope.options[index] = {
            buttons: {},
            group: elem
          }

          $("<div><span>" + optionGroupName + ":</span></div>").append(elem).insertAfter(selector);
        },

        addVariant: function(variant) {
          var key = this.variantKey(variant);

          if (!this.variants[key]) {
            this.variants[key] = variant;

            if (!this.defaultVariant || !this.defaultVariant.available) {
              this.defaultVariant = variant;
            }

            this.preload(variant.image);

            this.renderOptionButtons(variant.options);

            this.selectVariant(this.defaultVariant);
          }
        },

        variantKey: function(variant) {
          var scope = this;
          return $.map(variant.options, function(optionValue) {
            return scope.norm(optionValue);
          }).join("-");
        },

        preload: function(url) {
          if (url && !this.images[url]) {
            this.images[url] = new Image();
            this.images[url].src = url;
          }
        },

        renderOptionButtons: function(options) {
          var scope = this;
          $.each(options, function(index, optionValue) {
            var optionNormValue = scope.norm(optionValue);
            if (!scope.options[index].buttons[optionNormValue]) {
              var optionKey = 'group' + index,
                button = scope.renderButton(optionKey, optionNormValue, optionValue);
              scope.options[index].buttons[optionNormValue] = button.appendTo(scope.options[index].group);
            }
          });
        },

        selectVariant: function(variant) {
          var scope = this;
          $.each(variant.options, function(index, optionValue) {
            var optionNormValue = scope.norm(optionValue);
            scope.options[index].buttons[optionNormValue].click();
          });
        },

        // ------------------------------------------  sort me

        values: function(hash) {
          return $.map(hash, function(value, key) {
            return value;
          });
        },

        norm: function(value) {
          return value.replace(/[ .\/]/g, "").replace(/ß/, "s").replace(/ü/, "u");
        },

        optionKeys: function() {
          return $("#options div").map(function() {
            return $(this).first().find('input').attr('name');
          });
        },

        option: function(optionKey, optionValue) {
          var scope = this;
          return $('#options .' + optionKey + ' .option').filter(function() {
            return $(this).find('input[value=' + scope.norm(optionValue) + ']')[0];
          });
        },


        currentVariantKey: function() {
          var scope = this;

          return $.map(scope.options, function(values, index) {

  // currentOptionValue: function(optionKey) {
  //         var elements = $('#options .' + optionKey + ' .option'),
  //         element = elements.filter('.over')[0] || elements.filter('.active')[0];

  //         return $(element).find('input').val();
  //       },


            return values.group.find(':checked').val();
          }).join('-');
        },

        update: function() {
          var selector = $(this.element),
          key = this.currentVariantKey(),
          variant = this.variants[key];
          if (variant) {
            selector.val(variant.id);
          }
          selector.trigger('variantChange', variant);
        },

        setAvailability: function(optionKey, possibleVariants) {
          var elements = $('#options .' + optionKey + ' .option'),
          sibblingVariants = [];

          elements.trigger('availability', false);
          sibblingVariants = $.grep(possibleVariants, function(variant) {
            return option(optionKey, variant.options[optionKey])
              .trigger('availability', variant.available)
              .hasClass('active');
          });
          elements.trigger('resolveAvailabilityConflict');
          return sibblingVariants;
        },

        setAvailabilites: function() {
          var scope = this,
          possibleVariants = this.values(variants);

          $.each(scope.optionKeys(), function(index, optionKey) {
            possibleVariants = scope.setAvailability(optionKey, possibleVariants);
          });
        },

        toggleClassName: function(node, className) {
          return node.addClass(className).siblings().removeClass(className).end();
        },

        renderButton: function(optionKey, optionValue, display) {
          var scope = this,
          button = $('<input type="radio" name="' + optionKey + '" value="' + optionValue +'">')
            .on('click', function(event) {
              // console.log('inputclick');
              scope.toggleClassName($(this).parent(), 'active');
              scope.update();
              event.stopPropagation();
              // $(this).not('.unavailable').not('.active').each(function() {
              //   scope.toggleClassName($(this), 'active')
              //     .find('input:radio')
              //       .prop('checked', true)
              //       .siblings()
              //       .prop('checked', false);
              //   scope.setAvailabilites();
              // });
            })
            // .on('availability', function(event, available) {
            //   $(this)
            //     .toggleClass('unavailable', !available)
            //     .toggleClass('disabled', !available)
            //     .find('input:radio')
            //       .attr('disabled', !available);
            // })
            // .on('resolveAvailabilityConflict', function() {
            //   $(this).filter('.active.unavailable').each(function() {
            //     $(this)
            //       .siblings().not('.unavailable').first()
            //       .click();
            //   });
            // });

          return $('<label class="btn--secondary option optionValue' + optionValue + '">')
            .attr('title', optionKey + ': ' + display)
            .append(button, $('<span>' + display + '</span>'))
            .on('click', function(event) {
              // console.log('labelclick');
               // scope.update();
               // event.stopPropagation();
               //               event.stopImmediatePropagation();

            })
            .on('mouseover', function() {
              scope.toggleClassName($(this), 'over');
              scope.update();
            }).on('mouseout', function() {
              $(this).removeClass('over');
              scope.update();
            });
        },


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
