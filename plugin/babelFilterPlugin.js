"use strict";

var path = require("path");
var glob = require("glob");
var utils = require("../src/filterUtils");

/**
 * Find the root of the project on which we're executing this babel plugin
 */
var findProjectDir = function(currentFile) {
    var result = path.dirname(currentFile);

    var tokens = result.split("/"), paths, dir;
    for (var i = tokens.length - 1; i > 0; i--) {

        dir = result.substring(0, result.lastIndexOf("/" + tokens[i]));
        paths = new glob.sync("node_modules", {cwd: dir});

        if (paths && paths.length) {
            break;
        }

        result = dir;
    }

    return result;
};

var getSearchingDirPattern = function(currentFile, relativeImportPath, fileBaseName, projectRootDir, filterFolder) {
    var result;

    var relativeImportDirName = path.dirname(relativeImportPath),
        fileBaseNamePattern = fileBaseName.split(".")[0] + "*",
        filePathSearchingTokens = path.join("/", relativeImportDirName); // removing .. from relative paths

    if (filterFolder) {
        // If the filterFolder option is enabled
        result = path.join("**", filePathSearchingTokens, fileBaseNamePattern);

    } else if (relativeImportPath.startsWith(".")) {
        // If it's a relative import, compute the final directory destination thanks to the current file path
        // (only keep the relative path from the project root for the search to come)
        result = path.relative(
            projectRootDir,
            path.join(path.dirname(currentFile), relativeImportDirName, fileBaseNamePattern)
        );

    } else {
        // If it's not a relative import then we assume it's an import from the project root dir
        result = path.join(relativeImportDirName, fileBaseNamePattern);
    }

    return result;
}

/**
 * This function is filtering the require call in js files
 * trying to replace require to non existing file to a derived file (if one can be found)
 */
var ImportsFilter = function(babel) {
    var projectRootDir;

    return new babel.Transformer("babel-platform", {
        ImportDeclaration(node, parent, scope, config) {

            // Let's find the prject specific conf

            var pluginConf = config.opts.extra["gulp-platform-file"] || {},
                dimensions = pluginConf.dimensions || [],
                filterFolder = pluginConf.filterFolder,
                filteringTokens = utils.getConf(dimensions),
                currentFile = scope.path.state.opts.sourceFileName;

            projectRootDir = findProjectDir(currentFile); // The project src dir can be different between two files

            // Let's retrieve the path from the require call
            // and check if there really is such a file

            var relativeImportPath = node.source.value,
                fileBaseName = path.basename(relativeImportPath);

            // Search for all potential matching files whithin the searchingDir
            var absoluteMatchingPaths = new glob.sync(
                getSearchingDirPattern(currentFile, relativeImportPath, fileBaseName, projectRootDir, filterFolder),
                {cwd: projectRootDir}
            );

            if (absoluteMatchingPaths.length) {

                // At least one existing path has been found,
                // let's check the compile options and try to find the appropriate import

                var dir = path.dirname(absoluteMatchingPaths[0]),
                    name = utils.getFileNameBaseFrom(fileBaseName, dimensions);

                // name is supposed to have an extension, if no extension add the default ".js"
                if (!path.extname(name)) { // modules are often imported without precising the js extension
                    name += ".js";
                }

                var matchingFile = path.basename(utils.find(path.join(projectRootDir, dir), projectRootDir, name, dimensions, filteringTokens));

                if (matchingFile !== fileBaseName) {

                    // A specific path has been found ! Let's update the require call
                    node.source.value = relativeImportPath.replace(fileBaseName, matchingFile);

                } else {

                    // Check that the current import does exist, otherwize display an error
                    var isCurrentImportExist = absoluteMatchingPaths.filter(function(p) { return p.indexOf(matchingFile) >= 0 }).length;
                    if (!isCurrentImportExist) {
                        console.error(
                            "Bad import found :",
                            node.source.value,
                            "There is no such file. No derived file could match either. Are you sure this import is correct ?"
                        );
                    }
                }
            }

            return node;
        }
    });
};

module.exports = ImportsFilter;
