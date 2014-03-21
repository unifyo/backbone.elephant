/*
 * Backbone.Elephant, v0.1
 * Copyright 2013-2014 Handy Elephant Ltd.
 * Distributed under the MIT license.
 * https://bitbucket.org/handyelephant/backbone.elephant
*/
(function(root, factory) {

	if (typeof define === 'function' && define.amd) {
		define(['underscore', 'backbone'], factory);
	} else if (typeof exports !== 'undefined') {
		module.exports = factory(require('underscore'), require('backbone'));
	} else {
		factory(root._, root.Backbone);
	}
}(this, function(_, Backbone) {
  
  var originalStopListening = Backbone.View.prototype.stopListening;
  /*
   * Override Backbone.View#stopListening, so child views are removed correctly.
   *
   * All Backbone.View with child views must define childViews,
   * a function which returns a list of child views of that view.
   *
   * Parent views are also responsible for ensuring child views have
   * parentView set to point to them.
   */
  Backbone.View.prototype.stopListening = function() {
    if(this.childViews) {
      _.each(this.childViews(), function(view) {
        view.stopListening();
      });
    }
    if(this.parentView) {
      this.parentView = null;
    }
    originalStopListening.call(this);
  };

  var originalRemove = Backbone.View.prototype.remove;
  /* 
   * Override Backbone.View#remove to clear the rendered flag.
   */
  Backbone.View.prototype.remove = function() {
    // Since this is only called from Backbone.View#remove
    if(this.rendered) {
      this.rendered = false;
    }
    originalRemove.call(this);
  };

  /*
   * Let a view ask an ancestor view to do something without knowing which view to call.
   *
   * Calling this.handleAction(actionName, ...) will walk up the chain of parent views,
   * until an entry matching actionName is found in the actions object.
   *
   * The actions object functions exactly like the events object, except named
   * actions are mapped to functions to handle that action.
   *
   * If the action function returns false, the call continues to propogate upwards.
   */
  Backbone.View.prototype.handleAction = function(action) {
    if (_.isObject(this.actions)) {
      var actionFn = this[this.actions[action]];
      if(actionFn) {
        var result = actionFn.apply(this, _.rest(arguments));
        if(result !== false) {
          return result;
        }
      }
    }
    if(this.parentView) {
      return this.parentView.handleAction.apply(this.parentView, arguments);
    }
  };

  var SeaView = Backbone.SeaView = Backbone.View.extend({
    /* subViews: {
      ".subViewClass1" : "subView1"
    },*/

    /*
     * renderInner: function() {
     *   this.$el.html('<div class="subViewClass1"></div>');
     *   return this;
     * }
     */

    /*
     * needsRepeatableRender: boolean
     */

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);

      this.subViewsBySelector = {};
      _.each(this.subViews, function (viewName, selector) {
        var view = this[viewName];
        if(view) {
          view.parentView = this;
          this.subViewsBySelector[selector] = view;
        }
        this.listenTo(this, "change:" + viewName, _.bind(this.changeSubView, this, selector));
      }, this);
    },

    childViews: function() {
      return _.values(this.subViewsBySelector);
    },

    changeSubView: function(selector) {
      var viewName = this.subViews[selector];
      var previousView = this.subViewsBySelector[selector];
      if(previousView) {
        previousView.remove();
      }
      var newView = this[viewName];
      this.subViewsBySelector[selector] = newView;
      if(newView) {
        newView.parentView = this;
        if(this.rendered) {
          this.$(selector).first().html(newView.render().el);
        }
      }
    },

    render: function() {
      if(this.rendered) {
        if(!this.needsRepeatableRender) {
          return this;
        }
        _.each(this.subViewsBySelector, function(view, selector) {
          if (view.rendered) {
            view.$el.detach();
          }
        });
      }

      this.renderInner();
      
      _.each(this.subViewsBySelector, function(view, selector) {
        this.$(selector).first().append(view.rendered ? view.el : view.render().el);
      }, this);

      this.rendered = true;
      return this;
    }
  });

  // Inspired by http://liquidmedia.ca/blog/2011/02/backbone-js-part-3/,
  // amongst many others.

  var CollectionView = Backbone.CollectionView = Backbone.View.extend({
    viewFromModel: function(model) {
      throw "CollectionView must be extended with a viewFromModel function";
    },
    
    constructor : function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if (_.isObject(options) && options.viewFromModel) {
        this.viewFromModel = options.viewFromModel;
      }
   
      this.subViewsByIndex = [];
      this.subViewsByModelCid = {};

      this.listenTo(this.collection, 'add', this.collectionAdd);
      this.listenTo(this.collection, 'remove', this.collectionRemove);
      this.listenTo(this.collection, 'reset', this.collectionReset);
      this.listenTo(this.collection, 'sort', this.collectionSort);
   
      this.collectionReset();
    },

    childViews: function() {
      return this.subViewsByIndex;
    },

    collectionReset: function() {
      var renderNeeded = this.rendered;
      if (renderNeeded) {
        this.rendered = false;
      }
      _.each(this.subViewsByIndex, function(view) {
        if (renderNeeded) {
          view.remove();
        } else {
          view.stopListening();
        }
      }, this);
      this.subViewsByIndex = [];
      this.subViewsByModelCid = {};
      this.collection.each(function(model, index) {
        this.collectionAdd(model, this.collection, {index: index});
      }, this);
      if (renderNeeded) {
        this.render();
      }
    },
   
    collectionAdd: function(model, collection, options) {
      var view = this.viewFromModel(model);
      var index = collection.indexOf(model);
      if (_.isFunction(view)) {
        view = new view({model: model});
      }
      view.parentView = this;
      this.subViewsByIndex.splice(index, 0, view);
      this.subViewsByModelCid[model.cid] = view;
      if(this.rendered) {
        var el = view.render().el;
        if (index == this.subViewsByIndex.length - 1) {
          this.$el.append(el);
        } else if (index === 0) {
          this.$el.prepend(el);
        } else {
          var referenceNode = this.subViewsByIndex[index + 1];
          this.el.insertBefore(el, referenceNode && referenceNode.el);
        }
        view.delegateEvents();
      }
    },

    collectionRemove: function(model, collection, options) {
      if (options.index !== -1) {
        var viewToRemove = this.subViewsByIndex.splice(options.index, 1)[0];
        delete this.subViewsByModelCid[model.cid];
        if(this.rendered) {
          viewToRemove.remove();
        } else {
          viewToRemove.stopListening();
        }
      }
    },

    collectionSort: function() {
      var i = this.collection.length;
      var referenceNode = null;
      while(i-- > 0) {
        var view = this.subViewsByModelCid[this.collection.at(i).cid];
        this.subViewsByIndex[i] = view;
        if(this.rendered) {
          var elNode = view.render().el;
          this.el.insertBefore(elNode, referenceNode);
          view.delegateEvents();
          referenceNode = elNode;
        }
      }
    },
   
    render: function() {
      if(!this.rendered) {
        this.rendered = true;
        this.$el.empty();
        _.each(this.subViewsByIndex, function(view) {
          this.$el.append(view.render().el);
          view.delegateEvents();
        }, this);
      }
      return this;
    }
  });

  return Backbone;
}));
