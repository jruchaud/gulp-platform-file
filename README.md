# gulp-platform-file
Gulp task that help you to filter the files of your project according to the evironment you're building for (platform, deployment target, language, or whatever dimensions you can imagine).

Installation
============

`npm install gulp-platform-file`

```js
var platformify = require("gulp-platform-file")
```

How it works
============

For example, you have :
 * test.js
 * test-ios.js
 * test-android.js

You want to only keep "ios" or "android" files when you build your application.
Just configure the filter with your dimension on "ios" and "android" in Gulp task.

```platformify().filter(["android", "ios"]);```

Then call gulp:

```gulp --ios```

So you get only "test-ios.js".

You can have many dimensions. In this case the defining order is important, the first dimension has the most important weight.

For example, you have :
 * test.js
 * test-prod.js
 * test-prod-ios.js

With:

```platformify().filter(["prod", "dev"]).filter(["android", "ios"]);```

or

```platformify().setDimensions([["prod", "dev"],["android", "ios"]]);```

You get:

```gulp --ios --dev``` --> test.js

```gulp --ios --prod``` --> test-prod-ios.js

```gulp --android --prod``` --> test-prod.js

Gulp
====

You can use gulp-platform-file to filter files during Gulp process.

```js
gulp.task("default", function() {
    gulp.src("files/*")
        .pipe(platformify()
              .filter(["prod", "dev", "test"])
              .filter(["android", "ios"])
         )
        .pipe(gulp.dest("dist"));
});
```

Browserify
==========

You can use gulp-platform-file with Browserify.

```js
gulp.task("default", function() {
    var browserify = require("browserify"),
        source = require("vinyl-source-stream");

    return browserify({
        entries: "test.js"
    })
    .transform(platformify
              .filter(["prod", "dev", "test"]))
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(gulp.dest("dist"));
});
```

Babel
=====

You can use gulp-platform-file with Babel or babelify if you're using es6 modules syntax.

```js
gulp.task("withBabel", ["clean"], function() {
    return browserify({
        entries: "test.js"
    })
    .transform(babelify.configure({
        compact: false,
        extra: {
            "gulp-platform-file": {
                dimensions: [
                    ["test", "dev", "prod"],
                    ["sony", "android"]
                ]
            }
        },
        plugins: ["gulp-platform-file/plugin/babelFilterPlugin"]
    }))
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(gulp.dest("dist"));
});
```

The babel plugin will analyze imports decalrations in each file and change them if it founds a more appropriate one
according to your current building environment and to your dimensions.

API
===

### `platformify()` ###

Create the filter for Gulp or Browserify.

### `platformify().filter(dimension)` ###

Add a dimension.

License
=======

[MIT License](LICENSE).
