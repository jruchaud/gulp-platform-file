"use strict";

var through = require("through2");
var path = require("path");
var fs = require("fs");

function filter(param, filePath) {

    var outFiles = {};

    var find = function(fPath) {
        var rst = fPath;

        // test on param

        var dir = path.dirname(fPath);
        var fileBaseName = path.basename(fPath, path.extname(fPath));
        var filesInDir = fs.readdirSync(dir);

        for (var fileName of filesInDir) {
            if (fileName.indexOf(fileBaseName) >= 0) {
                var regex = new RegExp("(.*?[^-]*)-([^-\\.]*)(\\.|-)?.*");
                var desc = regex.exec(fileName);

                if (desc[2] === param) {
                    rst = path.join(dir, fileName);
                    break;
                }
            }
        }

        return rst;
    };

    return through.obj(function(file, encoding, cb) {

        var specificPath = find(filePath || file.path);

        fs.readFile(specificPath, function(err, data) {
            outFiles[specificPath] = data;
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
