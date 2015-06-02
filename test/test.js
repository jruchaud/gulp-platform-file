"use strict";

var gulp = require("gulp"),
    gutil = require("gulp-util"),
    filter = require("../index.js");

gulp.task("default", function() {
    gulp.src("files/*")
        .pipe(filter("sam"))
        .pipe(gulp.dest("dist/"));
/*
        .pipe(gutil.buffer(function(err, files) {
                gutil.log(err, files);
            })
         );
*/
});
