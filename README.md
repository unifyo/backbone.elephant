# Backbone.Elephant

A simple, light-weight and opinionated for making [Backbone.js](https://backbonejs.org) Views managable.

## Features
- A protocol for handling the destruction of child views correctly and uniformly.
- A simple LayoutView that can include one or more views inside itself.
- A CollectionView for rendering one view per model in a collection, and keep this up-to-date without extra coding or extraneous re-renders.
- A simple function to handle actions that decouples defining a view beahviour from the side-effects of that behaviour.

## Feature Details

### Protocol for handling child views

Backbone is well-known for not handling child views particularly well.
Because of this, a profusion of View libraries exist.
And as everyone knows, the solution to N competing standards is the N+1th standard.
Seriously however, this part of the library is extremely simple, modifies Backbone in two places, and provides a expandable system for any design of sub-views.

The problem with sub-views in Backbone is getting the stopListening function called on each of them when the parent view is destroyed.
Obviously, this can be solved in various ways -- events, recursion, global unbinds.
This plugin makes the stopListening function recursive, by requiring each view that has child views provides a `childViews` method to enumerate them.

This method is clean, simple to implement, and can cover any kind of sub view.

### LayoutView

LayoutView takes an array of CSS selectors to instance variable names, and inserts the Views inside relevant instance variables into the right part of the DOM.

So, if you define the subviews as:

```ruby
  subViews: {
    ".header": "header",
    ".footer": "footer",
    ".main": "main"
  }
```

then `this.header` will be placed into `this.$(".header")` and so on.

If you change one view for another, for example swapping a main section for another one, then call `this.trigger('change:main')` and the view will update (and the old view will be destroyed.)

In our code base, we add a set function to views that triggers change events automatically. Something like this is not necessary but is recommended.

Because LayoutView needs to act after rendering has happened, do not override the render method, but instead define a method called `renderInner`, which will do the rendering.

If `renderInner` always returns the same thing, define `renderInnerIsConstant` to make `render` idempotent.

### CollectionView

CollectionView takes a collection and requires you define a `viewFromModel` function, which takes a model and is responsible for returning a View class, or a View instance bound to that model.
This allows rendering different views for different models in the same collection.

The CollectionView will listen to all the relevant Collection events (add, remove, reset, and sort) and make the the relevant changes to the views.

### handeAction

This is a helper method for child views to ask an ancestor view to handle something.
It is called like: `this.handleAction("newTodo", ...)`.
The view and each parent view in turn is searched for a handler for the `newTodo` action.
When a handler is found, it is invoked with the other arguments, and the result returned.
If a handler returns exactly `false`, the search continues, allowing selective handling of actions.

Action handlers are defined like event handlers, using an `actions` object.
For example, handling `newTodo` with a `createTodo` function would look like:

```ruby
  actions: {
    "newTodo": "createTodo"
  }
```

## Example
Check out the examples/todo directory for a quick rewrite of the backbone.js todo example to use most of the features of this library.

## Licence and contributing

Backbone.Elephant is licensed with the same MIT licence as Backbone itself.
Issues, patches, ideas and pull requests all welcome!
