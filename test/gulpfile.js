"use strict";

var gulp = require("gulp"),
    gutil = require("gulp-util"),
    filter = require("../index.js"),
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
        .pipe(filter(["sony", "prod"]))
        .pipe(gulp.dest(paths.build));
});

gulp.task("withBrowserify", ["clean"], function() {
    return browserify({
        entries: paths.entryPoint
    })
    .transform(filter.bind(filter, ["test", "sony"]))
    .bundle()
    .pipe(source(paths.outputFile))
    .pipe(gulp.dest(paths.build));
});
