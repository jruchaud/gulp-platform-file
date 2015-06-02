"use strict";

var through = require("through2");

function filter(param) {

    var outFiles = {};

    return through.obj(function(file, encoding, cb) {
        var path = file.path;
        var regex = new RegExp("(.*?[^/-]*)(-([^/]*))?(\\..*)$");
        var desc = regex.exec(path);

        var fileName = desc[1] + desc[4];
        if (desc[3]) { // - ?
            if (desc[3] === param) {
                outFiles[fileName] = file;
            }

        } else if (!outFiles[fileName]) {
            outFiles[fileName] = file;
        }

        cb();
    }, function(cb) {
        for (var fileName in outFiles) {
            if (outFiles.hasOwnProperty(fileName)) {

                var file = outFiles[fileName];
                file.path = fileName;
                this.push(file);
            }
        }
        cb();
    });
}

module.exports = filter;
