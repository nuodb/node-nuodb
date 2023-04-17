// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bindings_1 = __importDefault(require("bindings"));
const addon = (0, bindings_1.default)('nuodb.node');
const connection_js_1 = __importDefault(require("./connection.js"));
const util_1 = __importDefault(require("util"));
const segfault_handler_1 = __importDefault(require("segfault-handler"));
segfault_handler_1.default.registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name
class Driver {
    constructor() {
        this.defaults = {
            hostname: 'localhost',
            port: '48004',
            schema: 'USER',
            user: 'dba',
            database: 'test@localhost',
            password: 'dba'
        };
        this._driver = new addon.Driver();
        this._connect = function (config, callback) {
            config = this.merge(config);
            const extension = (err, connection) => {
                if (!!err) {
                    callback(err, connection);
                    return;
                }
                if (!!connection) { // neither undefined nor null
                    connection_js_1.default.extend(connection, this);
                }
                callback(null, connection);
            };
            //?? Testing if returning doesn't cause any issues
            return this._driver.connect(config, extension); //? This ultimately adds the proper arguments to the C++ Driver's connect function
        };
        // This will adorn calls to `connect` with an additional Function;
        // the 'promisify function' is last in the list. Therefore, the calls
        // to connect will follow these forms:
        //
        // Promise-based:   [ {}, Function ]
        // Async-based:     [ {}, Function, Function ]
        this.connect = util_1.default.promisify(this._connect);
    }
    merge(config) {
        const _driver = this;
        config || (config = {
            database: '',
            user: '',
            password: ''
        });
        function resolve(config, key, override) {
            let value;
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
    }
}
exports.default = Driver;
//# sourceMappingURL=driver.js.map