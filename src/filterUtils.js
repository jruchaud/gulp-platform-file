"use strict";

var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var util = require('gulp-util');

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
 * @param   {String} fileName   base name of the file
 * @param   {Array of Array of String dimensions   list of dimensions
 * @returns {Array of String} base name tokens
 */
var getBaseTokens = function(fileName, dimensions) {
    var allTokens = getTokens(fileName),
        filteredTokens = getFilteredTokens(fileName, dimensions, true);

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
 * @param   {String} fileName          base name of the file to test
 * @param   {String} fileBaseName      base name of the file used as a reference
 * @param   {Array of Array of String} dimensions   list of the dimensions
 * @returns {Array of String} list of the dimensionals tokens found in the fileName if derived from fileBaseName, false otherwize
 */
var isDerivedFrom = function(fileName, fileBaseName, dimensions) {
    var allTokens = getTokens(fileName),
        filteredTokens = getFilteredTokens(fileName, dimensions, true),
        diff = _.difference(allTokens, filteredTokens);

    var baseDiff = getBaseTokens(fileBaseName, dimensions);

    return diff.length == baseDiff.length && filteredTokens || [];
};

/**
 * Get the real name without tokens for a file name.
 * @param {String}                     fileName   file name
 * @param {Array of array of string}   dimensions tokens defining every dimension
 */
var getFileNameBaseFrom = function(fileName, dimensions) {
    var baseTokens = getBaseTokens(fileName, dimensions);

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

    if (rst.length !== tokens.length) { // It's not a perfect match
        rst = null;
    }

    return rst;
};

/**
 * Check the given path and determine if it holds some dimensions token in it
 * If it's the case, this function determine if it matches the current filtering tokens or not.
 *
 * Example :
 * the current filterfing tokens are : sony and dev
 * /common/defaultStuff/myFile.txt => true
 * /common/sony-prod/myFiles.txt => false
 * /common/sony-dev/myFiles.txt => true
 *
 * @returns true if the path is valid according to the current filtering tokens, false otherwize
 */
var isValidPath = function(dir, baseDir, dimensions, filteringTokens) {
    var rst = true;

    var folders = path.relative(baseDir, dir).split("/");
    for (var folderName of folders) {
        if (!isPerfectMatch(getFilteredTokens(folderName, dimensions), filteringTokens)) {
            rst = false;
            break;
        }
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
var find = function(dir, baseDir, fileBaseName, dimensions, filteringTokens) {
    var rst;

    // First, let's analyze the dir path and filter out non matching path

    if (!isValidPath(dir, baseDir, dimensions, filteringTokens)) {

        console.log(">>> Excluding", dir);

    } else {
        rst = path.join(dir, fileBaseName);

        // Retrieve potential candidates within the dir

        var candidates = fs.readdirSync(dir).filter(function(item) {
            return getFileNameBaseFrom(item, dimensions) === fileBaseName;
        });

        var bestScore = 0;
        for (var fileName of candidates) {

            var tokens = isDerivedFrom(fileName, fileBaseName, dimensions);

            // Check if the intersection is a perfect match and retrieve the matching tokens if so
            var perfectMatchTokens = isPerfectMatch(tokens, filteringTokens);
            if (perfectMatchTokens) {
                var score = computeScore(perfectMatchTokens, dimensions);
                if (score > bestScore) {
                    bestScore = score;
                    rst = path.join(dir, fileName);
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
