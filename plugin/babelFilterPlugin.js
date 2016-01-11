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

var getSearchingDirPattern = function(currentDir, relativeImportPath, fileBaseName, projectRootDir, fullHierarchySupportEnabled) {
    var result; // Note : the result has to be relative to the project root dir so that the projectRootDir can be use has a cwd option for the glob search.

    var relativeImportDirName = path.dirname(relativeImportPath),
        fileBaseNamePattern = fileBaseName.split(".")[0] + "*",
        dirNamePattern = path.normalize(relativeImportDirName) // removing .. from relative paths;

    if (fullHierarchySupportEnabled) {
        // If the fullHierarchySupport option is enabled
        result = path.join("**", dirNamePattern, fileBaseNamePattern);

    } else if (utils.isRelativePath(relativeImportPath)) {
        // If it's a relative import, compute the final directory destination thanks to the current file path
        // (only keep the relative path from the project root for the search to come)
        result = path.relative(
            projectRootDir,
            path.join(currentDir, relativeImportDirName, fileBaseNamePattern)
        );

    } else {
        // If it's not a relative import then we assume it's an import from the project root dir
        // FIXME : here we should be looking into the NODE_PATH environmental variable
        // For now, we will assume that the import is relative to the root of the project
        result = path.join(relativeImportDirName, fileBaseNamePattern);
    }

    return result;
}

var getAbsoluteImportPath = function(projectRootDir, absoluteCurrentPath, relativeImportPath) {

    var result;
    if (utils.isRelativePath(relativeImportPath)) {
        result = path.join(absoluteCurrentPath, relativeImportPath);
    } else {
        // FIXME : here we should be looking into the NODE_PATH environmental variable
        // For now, we will assume that the import is relative to the root of the project
        result = path.join(projectRootDir, relativeImportPath);
    }

    // Adding extension if no extension so that we return a significant absolute path
    if (!path.extname(result)) {
        result += ".js";
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
                fullHierarchySupport = pluginConf.fullDirHierarchySupport,
                filteringTokens = utils.getConf(dimensions);

            var currentFile = scope.path.state.opts.sourceFileName,
                currentDir = path.dirname(currentFile);

            projectRootDir = findProjectDir(currentFile); // The project src dir can be different between two files

            // Let's retrieve the path from the require call
            var relativeImportPath = node.source.value,
                absoluteImportPath = getAbsoluteImportPath(projectRootDir, currentDir, relativeImportPath),
                fileBaseName = path.basename(relativeImportPath);

            // Search for all potential matching files whithin the searchingDir
            var absoluteMatchingPaths = new glob.sync(
                getSearchingDirPattern(currentDir, relativeImportPath, fileBaseName, projectRootDir, fullHierarchySupport),
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

                // Let's do the magic and find the more appropiate path
                var matchingPath = utils.find(path.join(projectRootDir, dir), projectRootDir, name, dimensions, filteringTokens, true);

                // Let's check if there is a difference between the import path and the more appropriate path we just found
                if (path.relative(matchingPath, absoluteImportPath)) {
                    // Yep, a specific path has been found ! Let's update the require call

                    var newImportPath = path.relative(currentDir, matchingPath);
                    if (!utils.isRelativePath(newImportPath)) {
                        newImportPath = "./" + newImportPath; // from the current position, we need to add the ./ operator so that babel/browserify can resolve the dependency
                    }

                    node.source.value = newImportPath;

                } else {
                    // Check that the current import does exist, otherwize display an error
                    var matchingBaseName = path.basename(matchingPath);
                    var isCurrentImportExist = absoluteMatchingPaths.filter(function(p) { return p.indexOf(matchingBaseName) >= 0 }).length;
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
