"use strict";
// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
exports.__esModule = true;
var bindings_1 = require("bindings");
var addon = (0, bindings_1["default"])('nuodb.node');
var connection_mjs_1 = require("./connection.mjs");
var assert_1 = require("assert");
var util_1 = require("util");
var segfault_handler_1 = require("segfault-handler");
segfault_handler_1["default"].registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name
var Driver = /** @class */ (function () {
    function Driver() {
        var _this = this;
        this.defaults = {
            hostname: 'localhost',
            port: '48004',
            schema: 'USER'
        };
        this._driver = new addon.Driver();
        this._connect = function (config, callback) {
            //? const args: [Configuration, Function] = [].slice.call(arguments);
            //? assert(args.length > 0);
            // splice args  if first is function, and merge...
            // if (args.length > 0 && typeof args[0] === 'function') {
            // [args].splice(0, 0, {});
            // }
            config = _this.merge(config);
            // n.b. the original callback is always the first form provided
            //? const callback = args[1];
            var extension = function (err, instance) {
                if (err) {
                    callback(err);
                    return;
                }
                (0, assert_1["default"])(instance);
                if (instance) { // neither undefined nor null
                    connection_mjs_1["default"].extend(instance, _this);
                }
                callback(null, instance);
            };
            callback = extension;
            return _this._driver.connect(config, callback); //? This ultimately adds the proper arguments to the C++ Driver's connect function
        };
        // This will adorn calls to `connect` with an additional Function;
        // the 'promisify function' is last in the list. Therefore, the calls
        // to connect will follow these forms:
        //
        // Promise-based:   [ {}, Function ]
        // Async-based:     [ {}, Function, Function ]
        this.connect = util_1["default"].promisify(this._connect);
    }
    Driver.prototype.merge = function (config) {
        var _driver = this;
        config || (config = {});
        function resolve(config, key, override) {
            var value;
            if (override === undefined) {
                value = process.env['NUODB_' + key.toUpperCase()];
            }
            else {
                value = process.env[override];
            }
            return config[key] || value || _driver.defaults[key];
        }
        config.hostname = resolve(config, 'hostname');
        config.port = resolve(config, 'port');
        config.database = resolve(config, 'database');
        config.schema = resolve(config, 'schema');
        config.user = resolve(config, 'user');
        config.password = resolve(config, 'password');
        return config;
    };
    return Driver;
}());
exports["default"] = Driver;
