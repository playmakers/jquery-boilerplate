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
          options: [null, null, null], //shopify allows max 3 options
          hideSingleOptionsFromLevel: 0,
          resolveAvailabilityConflict: true,
          selectSoldOut: false
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

        this.const = {
          undefined: 'undefined',
          selected: 'selected',
          soldout: 'soldout',
          unavailable: 'unavailable',
          over: 'over',
          keySeparator: '-',
          undefinedVariant: {
            id: 'undefined'
          }
        }

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
          $("<option>")
            .text(scope.const.undefined)
            .appendTo(selector);

          // selector.hide();
        },

        addOption: function(optionGroupName) {
          var scope = this,
          selector = $(this.element),
          optionIndex = scope.options.length,
          elem = $('<div>'),
          optionGroup = $('<div>')
            .addClass('option' + scope.norm(optionGroupName))
            .append( $('<span>').text(optionGroupName) )
            .append(elem)
            .insertBefore(selector);

          scope.options[optionIndex] = {
            buttons: {},
            all: elem
          }

          if (this.settings.hideSingleOptionsFromLevel && optionIndex + 1 >= this.settings.hideSingleOptionsFromLevel) {
            optionGroup.hide();
          }
        },

        addVariant: function(variant) {
          var scope = this,
            preloadImage = function(url) {
              if (url && !scope.images[url]) {
                scope.images[url] = new Image();
                scope.images[url].src = url;
              }
            },
            variantKey = $.map(variant.options, this.norm).join(this.const.keySeparator);

          $.extend(variant, {
            onSale:      (variant.compare_at_price !== null && variant.price < variant.compare_at_price),
            soldOut:     (variant.inventory_quantity < 1 && variant.available),
            unavailable: (variant.inventory_quantity < 1 && !variant.available)
          })

          if (!this.variants[variantKey]) {
            this.variants[variantKey] = variant;

            preloadImage(variant.image);

            this.renderOptionButtons(variant.options);

            if (!this.defaultVariant || !this.defaultVariant.available) {
              this.defaultVariant = variant;
              this.selectVariant(this.defaultVariant);
            }
          }
        },

        selectVariant: function(variant) {
          var scope = this;

          $.each(variant.options, function(optionIndex, optionValue) {
            var optionNormValue = scope.norm(optionValue);
            scope.options[optionIndex].buttons[optionNormValue].find('input').click();
          });
        },

        optionKey: function(optionIndex) {
          return 'group' + optionIndex;
        },

        renderOptionButtons: function(variantOptions) {
          var scope = this;

          $.each(variantOptions, function(optionIndex, optionValue) {
            var optionNormValue = scope.norm(optionValue),
              optionGroup = scope.options[optionIndex];

            if (!optionGroup.buttons[optionNormValue]) {
              var button = scope.renderButton(optionIndex, optionValue);
              optionGroup.buttons[optionNormValue] = button.appendTo(optionGroup.all);

              if (optionGroup.all.find('label').length > 1) {
                optionGroup.all.parent().show();
              }
            }
          });
        },

        norm: function(value) {
          return value
            .replace(/[ .\/]/g, "")
            .replace(/ß/g, "ss")
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
        },

        currentVariantKey: function() {
          var scope = this;

          return $.map(this.options, function(optionGroup) {
            var element = optionGroup.all.find('.' + scope.const.over)[0] || optionGroup.all.find('.' + scope.const.selected)[0];

            return $(element).find('input').val();
          }).join(scope.const.keySeparator);
        },

        updateSelection: function() {
          var selector = $(this.element),
            key = this.currentVariantKey(),
            variant = this.variants[key] || this.const.undefinedVariant;

          selector.val(variant.id);

          this.setAvailabilites();

          selector.trigger('variantChange', variant);
        },

        setAvailabilites: function() {
          var scope = this,
            values = function(hash) {
              return $.map(hash, function(value, key) {
                return value;
              });
            },
            setAvailability = function(optionIndex, optionGroupButtons, possibleVariants) {
              var sibblingVariants = [];

              $.each(optionGroupButtons, function(optionNormValue, button) {
                button
                  .trigger('availability', false)
                  .trigger('soldout', true);
              })
              sibblingVariants = $.grep(possibleVariants, function(variant) {
                var optionNormValue = scope.norm(variant.options[optionIndex]);

                if(variant.available) {
                  optionGroupButtons[optionNormValue].trigger('availability', true);
                }
                if(!variant.soldOut) {
                  optionGroupButtons[optionNormValue].trigger('soldout', false);
                }
                return optionGroupButtons[optionNormValue].hasClass(scope.const.selected);
              });

              if (scope.settings.resolveAvailabilityConflict) {
                $.each(optionGroupButtons, function(optionNormValue, button) {
                  button.trigger('resolveAvailabilityConflict');
                })
              }

              return sibblingVariants;
            },
            possibleVariants = values(this.variants);

          $.each(scope.options, function(optionIndex, optionGroup) {
            possibleVariants = setAvailability(optionIndex, optionGroup.buttons, possibleVariants);
          });
        },

        renderButton: function(optionIndex, optionValue) {
          var scope = this,
            toggleClassName = function(node, className) {
              return node.addClass(className).siblings().removeClass(className).end();
            },
            optionKey = scope.optionKey(optionIndex),
            optionNormValue = scope.norm(optionValue),
            button = $('<input>')
              .attr('type', 'radio')
              .attr('name', optionKey)
              .attr('value', optionNormValue)
              .on('click', function(event) {
                toggleClassName($(this).parent(), scope.const.selected);
                scope.updateSelection();
                event.stopPropagation();
              })

          return $('<label>')
            .addClass('optionValue' + optionNormValue)
            .attr('title', optionKey + ': ' + optionValue)
            .append(button, $('<span>').text(optionValue))
            .on('click', function(event) {
              // console.log(event);
            })
            .on('mouseover', function() {
              toggleClassName($(this), scope.const.over);
              scope.updateSelection();
            }).on('mouseout', function() {
              $(this)
                .removeClass(scope.const.over);
              scope.updateSelection();
            })
            .on('soldout', function(event, soldout) {
              $(this)
                .toggleClass(scope.const.soldout, soldout)
                .find('input:radio')
                  .attr('disabled', !scope.settings.selectSoldOut && soldout);
            })
            .on('availability', function(event, available) {
              $(this)
                .toggleClass(scope.const.unavailable, !available)
                .find('input:radio')
                  .attr('disabled', !available);
            })
            .on('resolveAvailabilityConflict', function() {
              $(this).filter('.' + scope.const.selected + '.' + scope.const.unavailable).each(function() {
                $(this)
                  .siblings()
                  .not('.' + scope.const.unavailable)
                  .first()
                  .find('input')
                  .click();
              });
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
