(function() {

  var view;
  var ChildView;
  var ParentView;

  var innerHTML = '<div class="subView1"><div class="c1"><span class="foo">Foo</span></div></div><div class="subView2"><div class="c2"></div></div>';
  var innerHTML2 = '<div class="subView1"></div><div class="subView2"><div class="c2"><span class="foo">Foo</span></div></div>';

  module("Backbone.SeaView", {
    setup: function() {
      ChildView = Backbone.View.extend({
        initialize: function() {
          this.fooCount = 0;
        },
        events: {
          "click .foo": "fooClick"
        },
        fooClick: function() {
          this.fooCount++;
        },
        render: function() {
          if (!this.rendered) {
            this.rendered = true;
            this.$el.html('<span class="foo">Foo</span>');
          }
          return this;
        }
      });
      ParentView = Backbone.SeaView.extend({
        initialize: function() {
          this.c1 = new ChildView({className: "c1"});
          this.c2 = new Backbone.View({className: "c2"});
        },
        subViews: {
          ".subView1" : "c1",
          ".subView2" : "c2"
        },
        renderInner: function() {
          this.$el.html('<div class="subView1"></div><div class="subView2"></div>');
          return this;
        }
      });
      view = new ParentView({});
    }
  });

  test("render", 1, function() {
    view.render();
    equal(view.$el.html(), innerHTML);
  });

  test("remove calls stopListening on child views", 2, function() {
    view.render();
    view.c1.listenTo(view, "foo", "foo");
    equal(_.keys(view.c1._listeningTo).length, 1);
    view.remove();
    equal(_.keys(view.c1._listeningTo).length, 0);
  });
  
  test("without renderInnerIsConstant, child views are detached so events still work", 2, function() {
    view.render();
    view.render();
    equal(view.$el.html(), innerHTML);
    view.c1.$(".foo").click();
    equal(view.c1.fooCount, 1);
  });

  test("with renderInnerIsConstant, render again does nothing", 0, function() {
    view.renderInnerIsConstant = true;
    view.render();
    view.renderInner = function() {ok(false)};
    view.render();
  });

  test("changeSubView works properly", 3, function() {
    view.render();
    var oldC1 = view.c1;
    view.c1 = null;
    view.changeSubView(".subView1");
    
    equal(oldC1.parentView, null);
    
    view.c2 = new ChildView({className: "c2"});
    view.changeSubView(".subView2");
    view.render();
    
    equal(view.$el.html(), innerHTML2);
    
    view.c2.$(".foo").click();
    
    equal(view.c2.fooCount, 1);
  });

  test("trigger('change:subview') works properly", 1, function() {
    var ParentViewStubbed = ParentView.extend({
      changeSubView: function(selector) {
        equal(selector, ".subView1");
      }
    });
    view = new ParentViewStubbed({});
    view.trigger("change:c1");
  });
})();
