/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*eslint-env node */
/*jslint node: true */
"use strict";

module.exports = function (grunt) {

    var _       = require("lodash"),
        common  = require("./lib/common")(grunt),
        build   = require("./build")(grunt),
        glob    = require("glob"),
        path    = require("path"),
        exec    = require("child_process").exec;

    function runNpmShrinkwrap(callback) {
        grunt.log.writeln("running npm shrinkwrap");
        exec('npm shrinkwrap', { cwd: '.' }, function (err, stdout, stderr) {
            if (err) {
                grunt.log.error(stderr);
            } else {
                grunt.log.writeln(stdout || "finished npm shrinkwrap");
            }
            return err ? callback(stderr) : callback(null, stdout);
        });
    }

    function fixIndent(file) {
        const npmShrinkwrapJSON = grunt.file.readJSON(file);
        common.writeJSON(grunt, file, npmShrinkwrapJSON);
    }

    grunt.registerTask("npm-shrinkwrap", "Regenerates shrinkwrap file", function () {
        // delete the old one
        grunt.file.delete("npm-shrinkwrap.json");

        // create a new one
        var done = this.async();
        runNpmShrinkwrap((err) => {
            if (!err) {
                fixIndent("package.json");
                fixIndent("npm-shrinkwrap.json");
            }
            return err ? done(false) : done();
        });
    });

};
