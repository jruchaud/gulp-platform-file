"use strict";

var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var util = require('gulp-util');

var getTokens = function(fileName) {
    return _.compact(fileName.split(/[.-]/));
};

/**
 * Process a file base name to extract from it every tokens
 * matching one of the filtering tokens defined in the dimensions
 * @returns {Array of string} List of the tokens that hav been found within the dimensions
 */
var getFilteredTokens = function(fileName, dimensions) {
    var tokens = getTokens(fileName);

    // Remove the first token which corresponds to the fileBaseName
    // and the last token which corresponds to the extension
    tokens.shift();tokens.pop();

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
        filteredTokens = getFilteredTokens(fileName, dimensions);

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
    var t = getFilteredTokens(fileBaseName, dimensions);
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
        filteredTokens = getFilteredTokens(fileName, dimensions),
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
 * Try to find the best matching candidate associated to a file in the same directory of that file
 * according to the given filtering tokens.
 * @param   {String} dir   Directory in which we should search for a derived file
 * @param   {String} fileBaseName   file name we should use as a base to look for derived file
 * @param   {Array of array of string}   dimensions tokens defining every dimension
 * @param   {Array of strings}   tokens on which is processed the filtering
 * @returns {String or null} String if a candidate has been found, null
 */
var find = function(dir, fileBaseName, dimensions, filteringTokens) {
    var rst = path.join(dir, fileBaseName);

    // Retrieve potential candidates within the dir

    var candidates = fs.readdirSync(dir).filter(function(item) {
        return getFileNameBaseFrom(item, dimensions) === fileBaseName;
    });

    var bestScore = 0;
    for (var fileName of candidates) {

        var tokens = isDerivedFrom(fileName, fileBaseName, dimensions);

        // Check how many tokens match the dimension filter
        var intersection = _.intersection(tokens, filteringTokens);
        var intersectionCount = intersection.length,
            tokensCount = tokens.length;

        if (tokensCount && intersectionCount === tokensCount) { // perfect match
            var score = computeScore(intersection, dimensions);
            if (score > bestScore) {
                bestScore = score;
                rst = path.join(dir, fileName);
            }
        }
    }

    if (bestScore) {
        console.log(">>> Substituting", fileBaseName, "with", path.basename(rst));
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
