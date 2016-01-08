"use strict";

// This is the test

import path from "path";
import a from "./other.js";
import b from "./common/subfolder/subTask.js";

var test = 3 * a;

console.log("This is the test dev. Result = ", test);

export default test;
