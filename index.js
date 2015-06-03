"use strict";

var through = require("through2");
var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var vinylFile = require('vinyl-file');

function filter(params, filePath) {

    var outFiles = {};

    return through.obj(function(file, encoding, cb) {

        var specificPath = find(filePath || file.path, params);

//        if (specificPath) {
//            outFiles[specificPath] = vinylFile.readSync(specificPath);
//        }
//
//        cb()
        console.log(specificPath)
        if (specificPath) {
            fs.readFile(specificPath, function(err, data) {

                    outFiles[specificPath] = data;

                cb();
            });
        } else {
            cb();
        }
    }
    ,function(cb) {
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

var find = function(filePath, filterKeys) {
    var rst = null;

    var dir = path.dirname(filePath);
    var fileBaseName = path.basename(filePath, path.extname(filePath));

    if (!isFileDerivation(fileBaseName)) { // only process root files (not the platform dependant ones)
        rst = filePath;

        // Retrieve potential candidates within the dir

        var candidates = fs.readdirSync(dir).filter(function(f) {
            return f.indexOf(fileBaseName) === 0;
        });

        var highestCount = 0;
        for (var fileName of candidates) {
            var tokens = fileName.split(/[.-]/)

            // Remove the first token wich corresponds to the fileBaseName
            tokens.shift();

            // Check how many tokens match the params filter
            var intersection = _.intersection(tokens, filterKeys);

            if (intersection.length > highestCount) {
                highestCount = intersection.length;
                rst = path.join(dir, fileName);
            }
        }
    }

    return rst;
};

var isFileDerivation = function(fileBaseName) {
    return fileBaseName.indexOf("-") >= 0;
}

module.exports = filter;
