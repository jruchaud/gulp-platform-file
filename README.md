# gulp-platform-file
Gulp task to filter files according to a platform.

Installation
============

`npm install gulp-platform-file`

```js
var  = require("gulp-platform-file")
```

How it works
============

For example, you have :
 * test.js
 * test-ios.js
 * test-android.js

You want to only keep "ios" or "android" files when you compile your application.
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

API
===

### `platformify()` ###

Create the filter for Gulp or Browserify.

### `platformify().filter(dimension)` ###

Add a dimension.

License
=======

[MIT License](LICENSE).
