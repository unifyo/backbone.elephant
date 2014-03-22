(function() {

  var view;
  var collection;
  var ChildView;
  var ParentView;

  module("Backbone.CollectionView", {
    setup: function() {
      collection = new Backbone.Collection([
        {
          id: 1,
          name: "Foo"
        },
        {
          id: 2,
          name: "Bar"
        },
        {
          id: 3,
          name: "Baz"
        }
      ], {parse: true});
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
            this.$el.html(this.model.get("name"));
          }
          return this;
        }
      });
      ParentView = Backbone.CollectionView.extend({
        viewFromModel: function(model) {
          return ChildView;
        }
      });
      console.log(collection);
      view = new ParentView({collection: collection});
    }
  });

  test("render", 1, function() {
    view.render();
    equal(view.$el.children().text(), "FooBarBaz");
  });

  test("add", 1, function() {
    view.render();
    collection.add({id: 4, name: "Quux"});
    equal(view.$el.children().text(), "FooBarBazQuux");
  });

  test("unshift", 1, function() {
    view.render();
    collection.unshift({id: 4, name: "Quux"});
    equal(view.$el.children().text(), "QuuxFooBarBaz");
  });

  test("remove", 1, function() {
    view.render();
    collection.remove(collection.get(2));
    equal(view.$el.children().text(), "FooBaz");
  });

  test("reset", 1, function() {
    view.render();
    collection.reset([{id: 1, name: "A"}, {id: 2, name: "B"}]);
    equal(view.$el.children().text(), "AB");
  });

  test("sort", 1, function() {
    view.render();
    collection.comparator = "name";
    collection.sort();
    equal(view.$el.children().text(), "BarBazFoo");
  });

  test("add whilst sorted", 1, function() {
    view.render();
    collection.comparator = "name";
    collection.sort();
    collection.add({id: 4, name: "Do"});
    equal(view.$el.children().text(), "BarBazDoFoo");
  });
  test("removing the CollectionView removes the children", 2, function() {
    view.render();
    var c1 = view.childViews()[0];
    c1.listenTo(view, "foo", "foo");
    equal(_.keys(c1._listeningTo).length, 1);
    view.remove();
    equal(_.keys(c1._listeningTo).length, 0);
  });
})();

