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


export interface Configuration {
  hostname?: string,
  port?: string,
  database: string,
  schema?: string,
  user: string,
  password: string,
  verifyHostname?: 'false'|'true',
  allowSRPFallback?: 'false'|'true'  
}

type ConnectionCallback = (err: unknown, connection: Connection) => void;
type Connect = (config: Configuration, callback?: ConnectionCallback) => Promise<Pick<Connection, 'execute'|'close'|'commit'|'rollback'>>;  // only exposing execute, close, commit, and rollback methods


class Driver {

  private defaults: Configuration = {
    hostname: 'localhost',
    port: '48004',
    schema: 'USER',
    user: 'dba',
    database: 'test@localhost',
    password: 'dba'
  }

  private _connect: Connect; 
  public connect: Connect;
  
  private _driver: { connect: (config: Configuration, callback?: ConnectionCallback) => Promise<Connection> };

  constructor () {
    this._driver = new addon.Driver();

    this._connect = function (config: Configuration, callback?: ConnectionCallback): Promise<Connection> {
      
      config = this.merge(config);
      
      const extension = (err: unknown, connection: Connection) => {
        if (!!err) {
          callback!(err, connection);
          return;
        }
        if (!!connection) { // neither undefined nor null
          Connection.extend(connection, this);
        }
        callback!(null, connection);
      };

      //?? Testing if returning doesn't cause any issues
      return this._driver.connect(config, extension); //? This ultimately adds the proper arguments to the C++ Driver's connect function
    }

    // This will adorn calls to `connect` with an additional Function;
    // the 'promisify function' is last in the list. Therefore, the calls
    // to connect will follow these forms:
    //
    // Promise-based:   [ {}, Function ]
    // Async-based:     [ {}, Function, Function ]
    this.connect = util.promisify(this._connect);
  }
  

  private merge(config: Configuration): Configuration {
    const _driver = this;
    config ||= {
      database: '',
      user: '',
      password: ''
    };

    function resolve(config: Configuration, key: keyof Configuration, override?: string): string {
      let value: string|undefined;
      if (override === undefined) {
        value = process.env['NUODB_' + key.toUpperCase()];
      }
      else {
        value = process.env[override];
      }
      return config[key] || value || _driver.defaults[key]!;
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
