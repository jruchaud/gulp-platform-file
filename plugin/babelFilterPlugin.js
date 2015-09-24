"use strict";

var path = require("path");
var globule = require("globule");
var utils = require("../src/filterUtils");

/**
 * Find the root of the project on which we're executing this babel plugin
 */
var findProjectDir = function(currentFile) {
    var rst = path.dirname(currentFile);

    var tokens = rst.split("/"), paths, dir;
    for (var i = tokens.length - 1; i > 0; i--) {

        dir = rst.substring(0, rst.lastIndexOf("/" + tokens[i]));
        paths = globule.find({srcBase: dir, src: "node_modules"});

        if (paths && paths.length) {
            break;
        }

        rst = dir;
    }

    return rst;
};

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
                filteringTokens = utils.getConf(dimensions);

            projectRootDir = projectRootDir || pluginConf.projectRootDir || findProjectDir(scope.path.state.opts.sourceFileName);

            // Let's retrieve the path from the require call
            // and check if there really is such a file

            var relativeImportPath = node.source.value,
                fileBaseName = path.basename(relativeImportPath),
                filePathSearchingTokens = path.join("/", path.dirname(relativeImportPath)); // removing .. from relative paths

            var absoluteMatchingPaths = globule.find({
                srcBase: projectRootDir,
                src: path.join("**", filePathSearchingTokens, fileBaseName.split(".")[0] + "*")
            });

            if (absoluteMatchingPaths.length) {

                // At least one existing path has been found,
                // let's check the compile options and try to find the appropriate import

                var dir = path.dirname(absoluteMatchingPaths[0]),
                    name = utils.getFileNameBaseFrom(fileBaseName, dimensions);

                // name is supposed to have an extension, if no extension add the default ".js"
                if (name.indexOf(".") < 0) { // modules are often imported without precising the js extension
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
