"use strict";

var path = require("path");
var globule = require("globule");
var utils = require("./filterUtils");

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
var requireFilter = function(babel) {
    var t = babel.types;

    var projectRootDir;

    return new babel.Transformer("babel-platform", {
        CallExpression(node, parent, scope) {
            var rst = node;

            if (t.isIdentifier(node.callee, {name: "require"})) {

                // let's find the prject root
                projectRootDir = projectRootDir || findProjectDir(scope.path.state.opts.sourceFileName);

                // let's retrieve the path from the require call
                // and check if there really is such a file

                var requiredPath = node.arguments[0].value;
                var existingPaths = globule.find({srcBase: projectRootDir, src: path.join("**", requiredPath + "*")});

                if (!existingPaths.length) {

                    // No path could have been found in the project to resolve the given require statement
                    // let's check if we can find a derived file instead

                    var basename = utils.getFileNameBaseFrom(path.basename(requiredPath, path.extname(requiredPath)), [["sony"]]);
                    existingPaths = globule.find({srcBase: projectRootDir, src: "**/" + basename+"*"});

                    if (existingPaths.length) {
                        var target = path.basename(existingPaths[0]);

                        // A specific path has been found ! Let's update the require call
                        rst =  "require('"+ requiredPath.replace(path.basename(requiredPath), target) + "')";
                    }
                }
            }

            return rst;
        }
    });
};

module.exports = requireFilter;
