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

For example, let's imagine that your workspace contains platform specific files :
 * test.js
 * test-ios.js
 * test-android.js

You're about to build your application but you want to build for a specific platform, let's say in our case either "ios" or "android".
To do so, you can use gulp-platform-file. Define "ios" and "android" as a dimension of your project and use gulp-platform-file as a filter in your Gulp task :

```
gulp.task("default", function() {
    gulp.src("workspace/**")
        .pipe(
            platformify().filter(["android", "ios"])
        )
        .pipe(gulp.dest("build/"));
});
```

Then call gulp with the platform for which you want to build as a parameter :

```gulp --ios```

The build directory will contain a file called "test.js" which contains the content of test-ios.js.

You can declare as many dimensions as you desire. But remember that the defining order is important : the first dimension has the most important weight.

For example, if your workspace contains :
 * test.js
 * test-prod.js
 * test-prod-ios.js
 * test-ios.js
 * test-android.js

With:

```platformify().filter(["prod", "dev"]).filter(["android", "ios"]);```

or

```platformify().setDimensions([["prod", "dev"],["android", "ios"]]);```

You will get:

```gulp --ios --dev``` --> test-ios.js

```gulp --ios --prod``` --> test-prod-ios.js

```gulp --android --prod``` --> test-prod.js

You can even apply your dimensions tokens directly on folders. For example, let's imagine your workspace contains the following tree :
```
stuff
    |__ stuff.txt
    |__ otherStuff.txt
stuff-dev-android
    |__ stuff.txt
prod
    |__ stuff.txt
```
You defined the following task :
```
gulp.task("default", function() {
    gulp.src("workspace/**")
        .pipe(
            platformify().setDimensions([
                ["android", "ios"],
                ["prod", "dev"]
            ])
        )
        .pipe(gulp.dest("build/"));
});
```

Then :

```gulp``` --> will copy stuff.txt and anotherStuf.txt from stuff directory into the build destination.

```gulp --dev --android``` --> will copy stuff.txt from stuff-dev-android directory and anotherStuff.txt from stuff directory into the build destination.

```gulp --dev``` --> will copy stuff.txt and anotherStuff.txt from stuff directory into the build destination.

```gulp --prod``` --> will copy stuff.txt from prod directory and anotherStuff.txt from stuff directory into the build destination.

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
