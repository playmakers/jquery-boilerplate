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

          $("<div><span>" + optionGroupName + ":</span></div>").append(elem).insertBefore(selector);
          // .hide();;
        },

        addVariant: function(variant) {
          var preloadImage = function(url) {
              if (url && !this.images[url]) {
                this.images[url] = new Image();
                this.images[url].src = url;
              }
            },
            variantKey = $.map(variant.options, this.norm).join("-");

          if (!this.variants[variantKey]) {
            this.variants[variantKey] = variant;

            if (!this.defaultVariant || !this.defaultVariant.available) {
              this.defaultVariant = variant;
            }

            preloadImage(variant.image);

            this.renderOptionButtons(variant.options);

            this.selectVariant(this.defaultVariant);
          }
        },

        selectVariant: function(variant) {
          var scope = this;

          $.each(variant.options, function(index, optionValue) {
            var optionNormValue = scope.norm(optionValue);
            scope.options[index].buttons[optionNormValue].find('input').click();
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
              var button = scope.renderButton(optionIndex, optionNormValue, optionValue);
              optionGroup.buttons[optionNormValue] = button.appendTo(optionGroup.group);
            }
          });
        },

        // ------------------------------------------  sort me

        norm: function(value) {
          return value.replace(/[ .\/]/g, "").replace(/ß/, "s").replace(/ü/, "u");
        },

        currentVariantKey: function() {
          return $.map(this.options, function(optionGroup) {
            var element = optionGroup.group.find('.over')[0] || optionGroup.group.find('.active')[0];
            return $(element).find('input').val();
          }).join('-');
        },

        update: function() {
          var scope = this,
            selector = $(this.element),
            key = this.currentVariantKey(),
            variant = this.variants[key];

          if (variant) {
            selector.val(variant.id);
          }
          scope.setAvailabilites();
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
                button.trigger('availability', false);
              })
              sibblingVariants = $.grep(possibleVariants, function(variant) {
                var optionValue = variant.options[optionIndex],
                  optionNormValue = scope.norm(optionValue);

                return $(optionGroupButtons[optionNormValue])
                  .trigger('availability', variant.available)
                  .hasClass('active');
              });

              $.each(optionGroupButtons, function(optionNormValue, button) {
                button.trigger('resolveAvailabilityConflict');
              })

              return sibblingVariants;
            },
            possibleVariants = values(this.variants);

          $.each(scope.options, function(optionIndex, optionGroup) {
            possibleVariants = setAvailability(optionIndex, optionGroup.buttons, possibleVariants);
          });
        },

        renderButton: function(optionIndex, optionValue, display) {
          var scope = this,
            toggleClassName = function(node, className) {
              return node.addClass(className).siblings().removeClass(className).end();
            },
            optionKey = scope.optionKey(optionIndex),
            button = $('<input type="radio" name="' + optionKey + '" value="' + optionValue +'">')
              .on('click', function(event) {
                // console.log('inputclick');
                toggleClassName($(this).parent(), 'active');
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

          return $('<label class="btn--secondary option optionValue' + optionValue + '">')
            .attr('title', optionKey + ': ' + display)
            .append(button, $('<span>' + display + '</span>'))
            .on('click', function(event) {
              // console.log('labelclick');
               // scope.update();
               // event.stopPropagation();
               // event.stopImmediatePropagation();

            })
            .on('mouseover', function() {
              toggleClassName($(this), 'over');
              scope.update();
            }).on('mouseout', function() {
              $(this).removeClass('over');
              scope.update();
            })
            .on('availability', function(event, available) {
              $(this)
                .toggleClass('unavailable', !available)
                .find('input:radio')
                  .attr('disabled', !available);
            })
            .on('resolveAvailabilityConflict', function() {
              $(this).filter('.active.unavailable').each(function() {
                $(this)
                  .siblings()
                  .not('.unavailable')
                  .first()
                  .find("input")
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
