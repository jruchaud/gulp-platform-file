"use strict";

var through = require("through2");
var fs = require("fs");

function filter(param, filePath) {

    var outFiles = {};

    var find = function(path) {
        // test on param
        return path;
    };

    return through.obj(function(file, encoding, cb) {

        var path = find(filePath || file.path);

        fs.readFile(path, function(err, data) {
            outFiles[path] = data;
            cb();
        });

    }, function(cb) {
        for (var fileName in outFiles) {
            if (outFiles.hasOwnProperty(fileName)) {

                var file = outFiles[fileName];
                this.push(file);
            }
        }
        cb();
    });
}

module.exports = filter;
