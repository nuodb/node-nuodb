// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
'use strict';
import bindings from 'bindings';
const addon = bindings('nuodb.node');
import Connection from './connection.mjs';
import util from 'util';
import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name
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
                    Connection.extend(connection, this);
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
        this.connect = util.promisify(this._connect);
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
export default Driver;
//# sourceMappingURL=driver.mjs.map