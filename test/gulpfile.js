"use strict";

var gulp = require("gulp"),
    gutil = require("gulp-util"),
    platformify = require("../index.js"),
    del = require("del");

var browserify = require("browserify"),
    source = require("vinyl-source-stream");

var babelify = require("babelify");

var paths = {
    entryPoint: "files/default/test.js",
    entryPointEs6: "files/es6/test.js",
    outputFile: "all.js",
    build: "dist/"
};

gulp.task("clean", function() {
    del([paths.build]);
});

gulp.task("default", ["clean"], function() {
    gulp.src("files/default/**")
        .pipe(platformify()
              .filter(["prod", "dev", "test"])
              .filter(["android", "ios"])
         )
        .pipe(gulp.dest(paths.build));
});

gulp.task("withBrowserify", ["clean"], function() {
    return browserify({
        entries: paths.entryPoint
    })
    .transform(platformify
              .filter(["prod", "dev", "test"])
              .filter(["android", "ios"]))
    .bundle()
    .pipe(source(paths.outputFile))
    .pipe(gulp.dest(paths.build));
});

gulp.task("withBabel", ["clean"], function() {
    return browserify({
        entries: paths.entryPointEs6
    })
    .transform(babelify.configure({
        compact: false,
        extra: {
            "gulp-platform-file": {
                dimensions: [
                    ["test", "dev", "prod"],
                    ["sony", "android"]
                ],
                fullDirHierarchySupport: false
            }
        },
        plugins: ["../plugin/babelFilterPlugin"]
    }))
    .bundle()
    .pipe(source(paths.outputFile))
    .pipe(gulp.dest(paths.build));
});
