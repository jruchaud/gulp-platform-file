"use strict";

// This is the test

var a = require("./other.js");

class Test {
    constructor() {
        this.a = a;
    }
}

modules.exports = Test;
