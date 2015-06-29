"use strict";

var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var util = require("gulp-util");
var globule = require("globule");

var getTokens = function(string) {
    return _.compact(string.split(/[.-]/));
};

/**
 * Process a file base name to extract from it every tokens
 * matching one of the filtering tokens defined in the dimensions
 * @returns {Array of string} List of the tokens that hav been found within the dimensions
 */
var getFilteredTokens = function(string, dimensions, isFile) {
    var tokens = getTokens(string);

    if (isFile) {
        // Remove the first token which corresponds to the fileBaseName
        // and the last token which corresponds to the extension
        tokens.shift();tokens.pop();
    }

    // remove unknown tokens from the list
    return _.intersection(tokens, _.flattenDeep(dimensions));
};

/**
 * Return the token of a file name that doesn't mathc any dimensional token
 * @param   {String} string   base name of the file
 * @param   {Array of Array of String dimensions   list of dimensions
 * @returns {Array of String} base name tokens
 */
var getBaseTokens = function(string, dimensions, isFile) {
    var allTokens = getTokens(string),
        filteredTokens = getFilteredTokens(string, dimensions, isFile);

    return _.difference(allTokens, filteredTokens);
};

/**
 * Determine if the given file is a root file or a derivation of a root file
 * which should be filtered according to the defined dimensions
 *
 * @param   {String} fileBaseName base name of a file
 * @param   {Array of Array of string}
 * @returns {Boolean} true if the file contains one more tokens defined within the dimensions
 */
var isFileDerivation = function(fileBaseName, dimensions) {
    var t = getFilteredTokens(fileBaseName, dimensions, true);
    return !!t.length;
};

var computeScore = function(tokens, dimensions) {
    var rst = 0;

    for (var t of tokens) {
        for (var i = 0, l = dimensions.length; i < l; i++) {
            if (dimensions[i].indexOf(t) >= 0) {
                rst = rst | 1 << l-i;
            }
        }
    }

    return rst;
};

/**
 * Check if the fileName is derived from the fileBaseName
 * according tot the dimensions that have been defined
 *
 * Examples :
 *
 * case 1
 * dimensions = [[android, ios]]
 * fileName = "test-android.js"    =>  true : fileName is derived from fileBaseName
 * fileBaseName = "test.js"
 *
 * case 2
 * dimensions = [[android, ios]]
 * fileName = "test-android-backup.js" => false : the two files have the same root but the fileName has an extra token,
 * fileBaseName = "test.js                not corresponding to any dimensions which means the 2 files have nothing in common.
 *
 * @param   {String} fileName          base name of the file to test
 * @param   {String} fileBaseName      base name of the file used as a reference
 * @param   {Array of Array of String} dimensions   list of the dimensions
 * @returns {Array of String} list of the dimensionals tokens found in the fileName if derived from fileBaseName, false otherwize
 */
var isDerivedFrom = function(string, baseString, dimensions, isFile) {
    var allTokens = getTokens(string),
        filteredTokens = getFilteredTokens(string, dimensions, isFile),
        diff = _.difference(allTokens, filteredTokens);

    var baseDiff = getBaseTokens(baseString, dimensions, isFile);

    return _.intersection(diff, baseDiff).length === baseDiff.length && filteredTokens || [];
};

/**
 * Get the real name without tokens for a file name.
 * @param {String}                     fileName   file name
 * @param {Array of array of string}   dimensions tokens defining every dimension
 */
var getFileNameBaseFrom = function(fileName, dimensions) {
    var baseTokens = getBaseTokens(fileName, dimensions, true);

    return baseTokens.join("-").replace(/-([^-]+)$/, ".$1"); // Replace the last "-" by "."
};

/**
 * Check if the intersection between tokens and filtering tokens is a perfect match
 * @param   {Array of String} tokens          tokens to analyze with the current filtering tokens
 * @param   {Array of String} filteringTokens tokens use to filter
 * @returns {Array of String} return the intersection if it's a perfect match
 */
var isPerfectMatch = function(tokens, filteringTokens) {
    var rst = _.intersection(tokens, filteringTokens);

    if (rst.length !== tokens.length || !rst.length) { // It's not a perfect match
        rst = null;
    }

    return rst;
};

/**
 * Check the given path is a derived path or not (according to the dimensions that have been defined)
 *
 * Example :
 * Let's say the dimensions are a simple array: [sony, ios]
 * /common/default/myFile.txt => true
 * /common/sony/myFiles.txt => false
 * /ios/myFiles.txt => false
 *
 * @returns true if the path is not a derived path (no dimensions tokens can be found in it)
 */
var isPlainPath = function(dir, baseDir, dimensions) {
    var derivedFolders = path.relative(baseDir, dir)
        .split("/")
        .filter(function(folderName) {
            var t = getFilteredTokens(folderName, dimensions);
            return t && t.length;
        });

    return !derivedFolders.length;
};

var getBestDirPath = function(dir, baseDir, fileBaseName, dimensions, filteringTokens) {
    var relativePath = path.relative(baseDir, dir);
    var dirTokens = relativePath.split("/");

    for (var i = 0, l = dirTokens.length; i < l; i++) {
        var t = dirTokens[i];
        if (t && t !== "..") {

            // let's read each folder level and check if we can find a derivation

            var readPath = path.join.apply(path, [baseDir].concat(dirTokens.slice(0, i))); // first time : path.join(baseDir, dirTokens[0]),
                                                                                            // then : path.join(baseDir, dirTokens[0], dirTokens[1]),...
                                                                                            // => go through all the dir hierarchy

            var bestScore = 0,
                candidates = fs.readdirSync(readPath);

            // for each level, check if there are some matching derived paths and and if so, find the best one

            for (var item of candidates) {
                var p = path.join(readPath, item);
                if (fs.statSync(p).isDirectory()) { // process only directories

                    var baseTokens = getBaseTokens(item, dimensions),
                        filteredTokens = !baseTokens.length && getFilteredTokens(item, dimensions) || isDerivedFrom(item, t, dimensions);

                    var perfectMatchTokens = isPerfectMatch(filteredTokens, filteringTokens);
                    if (perfectMatchTokens) {
                        var score = computeScore(perfectMatchTokens, dimensions);
                        var doesFileExist = globule.find({
                            srcBase: path.join.apply(path, [p].concat(dirTokens.slice(i + 1, l))),
                            src: getFileNameBaseFrom(fileBaseName, dimensions)
                        }).length;

                        if (score > bestScore && doesFileExist) {
                            bestScore = score;
                            dirTokens[i] = item;
                        }
                    }
                }
            }
        }
    }

    var rst = path.join.apply(path, [baseDir].concat(dirTokens));

    if (path.relative(rst, dir)) {
        console.log(">>> Substituting dir path from ", relativePath, "to", path.relative(baseDir, rst));
    }

    return rst;
};

/**
 * Try to find the best matching candidate associated to a file in the same directory of that file
 * according to the given filtering tokens.
 * @param   {String} dir   Directory in which we should search for a derived file
 * @param   {String} baseDir base directory as defined by gulp.src (see https://github.com/gulpjs/gulp/blob/master/docs/API.md, options.base)
 * @param   {String} fileBaseName   file name we should use as a base to look for derived file
 * @param   {Array of array of string}   dimensions tokens defining every dimension
 * @param   {Array of strings}   tokens on which is processed the filtering
 * @returns {String or null} String if a candidate has been found, null
 */
var find = function(dir, baseDir, fileBaseName, dimensions, filteringTokens, filterDir) {
    var rst;

    // First, let's analyze the dir path and filter out derived path :
    // we only deal with non derived path, figuring out later on if we should replace them with some matching derived path

    if (isPlainPath(dir, baseDir, dimensions)) {

        // Let's check now if a derived dir path holding a file which has the same root name has the fileBaseName
        // can match the filtering tokens

        var dirPath = dir;
        if (filterDir) {
            dirPath = getBestDirPath(dir, baseDir, fileBaseName, dimensions, filteringTokens);
        }

        rst = path.join(dirPath, fileBaseName);

        // Retrieve potential candidates within the dir

        var candidates = fs.readdirSync(dirPath).filter(function(item) {
            return getFileNameBaseFrom(item, dimensions) === fileBaseName;
        });

        var bestScore = 0;
        for (var fileName of candidates) {

            var tokens = isDerivedFrom(fileName, fileBaseName, dimensions, true);

            // Check if the intersection is a perfect match and retrieve the matching tokens if so
            var perfectMatchTokens = isPerfectMatch(tokens, filteringTokens);
            if (perfectMatchTokens) {
                var score = computeScore(perfectMatchTokens, dimensions);
                if (score > bestScore) {
                    bestScore = score;
                    rst = path.join(dirPath, fileName);
                }
            }
        }

        if (bestScore) {
            console.log(">>> Substituting", fileBaseName, "with", path.basename(rst));
        }
    }

    return rst;
};

var getConf = function(dimensions) {
    var envOptions = _.compact(_.keys(util.env));
    return _.intersection(envOptions, _.flattenDeep(dimensions));
};

module.exports = {
    getTokens: getTokens,
    getFilteredTokens: getFilteredTokens,
    getBaseTokens: getBaseTokens,
    isFileDerivation: isFileDerivation,
    isDerivedFrom: isDerivedFrom,
    getFileNameBaseFrom: getFileNameBaseFrom,
    find: find,
    getConf: getConf
};
