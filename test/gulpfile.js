"use strict";

var gulp = require("gulp"),
    gutil = require("gulp-util"),
    platformify = require("../index.js"),
    del = require("del");

var browserify = require("browserify"),
    source = require("vinyl-source-stream");

var paths = {
    entryPoint: "files/test.js",
    outputFile: "all.js",
    build: "dist/"
};

gulp.task("clean", function() {
    del([paths.build]);
});

gulp.task("default", ["clean"], function() {
    gulp.src("files/*")
        .pipe(platformify()
              .filter(["prod", "dev", "test"])
              .filter(["sony", "toshiba"])
         )
        .pipe(gulp.dest(paths.build));
});

gulp.task("withBrowserify", ["clean"], function() {
    return browserify({
        entries: paths.entryPoint
    })
    .transform(platformify
              .filter(["prod", "dev", "test"]))
    .bundle()
    .pipe(source(paths.outputFile))
    .pipe(gulp.dest(paths.build));
});
