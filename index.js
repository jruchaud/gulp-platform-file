"use strict";

var through = require("through2");
var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var util = require('gulp-util');

function filter(filePath) {
    var params = getConf();
    var outFiles = {};

    return through.obj(function(file, encoding, cb) {

        var specificPath = find(filePath || file.path, params);

        if (!specificPath) {
            cb();
            return;
        }

        fs.readFile(specificPath, function(err, data) {

            if (filePath) {
                outFiles[specificPath] = data;

            } else {
                file.contents = data;
                outFiles[specificPath] = file;
            }

            cb();
        });
    }
    ,function(cb) {
        for (var fileName in outFiles) {
            if (outFiles.hasOwnProperty(fileName)) {

                var file = outFiles[fileName];
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

        for (var fileName of candidates) {
            var tokens = _.compact(fileName.split(/[.-]/));

            // Remove the first token wich corresponds to the fileBaseName
            // and the last token which corresponds to the extension
            tokens.shift();tokens.pop();

            // Check how many tokens match the params filter
            var intersection = _.intersection(tokens, filterKeys),
                intersectionCount = intersection.length;

            var tokensCount = tokens.length;

            if (intersectionCount == tokensCount) {
                rst = path.join(dir, fileName);
                break;
            }
        }
    }

    return rst;
};

var isFileDerivation = function(fileBaseName) {
    return fileBaseName.indexOf("-") >= 0;
}

var getConf = function() {
    var rst;
    var profilePath = util.env.profilePath;

    if(!profilePath) {

        console.error("You need to specify a profile path (ex.: gulp --profilePath test/profiles.json)");

    } else {
        var profiles = require(profilePath);
        var targetProfile = profiles[util.env.profile];

        targetProfile = targetProfile || profiles["DEFAULT"];

        rst = Object.keys(targetProfile).map(function(k) { return targetProfile[k] });
    }

    return rst;
};

module.exports = filter;
