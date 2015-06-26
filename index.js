"use strict";

var through = require("through2");
var path = require("path");
var fs = require("fs");
var utils = require("./src/filterUtils.js");

var _dimensions = [];

var filter = function(tokens) {
    if (tokens) {
        _dimensions.push(tokens);
    }
    return this;
};

var setDimensions = function(dim) {
    if (dim) {
        _dimensions = dim;
    }
    return this;
};

function platformify(filePath) {
    var outFiles = {};

    var transform = through.obj(function(file, encoding, cb) {

        var filteringTokens = utils.getConf(_dimensions);

        var f = filePath || file.path,
            dir = path.dirname(f),
            baseDir = file.base || dir,
            base = path.basename(f),
            name = utils.getFileNameBaseFrom(base, _dimensions),
            key = path.join(dir, name);

        var specificPath;

        if (!outFiles[key] && fs.statSync(f).isFile()) {

            specificPath = utils.find(dir, baseDir, name, _dimensions, filteringTokens, true);

            if (specificPath) {
                fs.readFile(specificPath, function(err, data) {
                    if (!err && data) {
                        if (filePath) {
                            outFiles[key] = data;

                        } else {
                            file.path = key;
                            file.contents = data;
                            outFiles[key] = file;
                        }
                    }

                    cb();
                });
            }
        }

        if (!specificPath) {
            cb();
        }
    },
    function(cb) {
        for (var fileName in outFiles) {
            if (outFiles.hasOwnProperty(fileName)) {
                var file = outFiles[fileName];
                this.push(file);
            }
        }
        cb();
    });

    transform.filter = filter.bind(transform);
    transform.setDimensions = setDimensions.bind(transform);

    return transform;
}

platformify.filter = filter.bind(platformify);
platformify.setDimensions = setDimensions.bind(platformify);

module.exports = platformify;
