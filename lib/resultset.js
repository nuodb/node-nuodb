// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var util = require('util');
const loopDefer = require('./loopDefer');

function close(callback) {
  var self = this;
  self._close(function (err) {
    callback(err);
  });
}

var closePromisified = util.promisify(close);

function getRows() {
  var self = this;
  var args = [].slice.call(arguments);

  var cbIdx = 0;
  do {
    if (typeof args[cbIdx] === 'function') {
      break;
    }
    cbIdx++;
  } while (cbIdx < args.length);
  var callback = args[cbIdx];

  var extension = function (err, instance) {
    if (err) {
      callback(err);
    }
    // add future caching support here... (streams)
    callback(null, instance);
  };
  args[cbIdx] = extension;

  self._getRows.apply(self, args);
}

var getRowsPromisified = util.promisify(getRows);

// seed batch size with an arbitrary number to prevent unwitting hogging of the main event loop
function nonBlockingGetRows(){
  let numRows=null;
  let batchSize=null;
  let callback=null;
  const args = [].slice.call(arguments);

  // parse the args, and maintain callback support
  for(let i = 0; i < args.length; i++) {
    if(typeof args[i] === 'number' && numRows === null) {
      numRows = args[i];
    } else if(typeof args[i] === 'number' && batchSize === null) {
      batchSize = args[i];
    } else if (typeof args[i] === 'function') {
      callback = args[i];
    } else {
      console.error(`unrecognized argument ${args[i]} of type ${typeof args[i]}`)
    }
  }

  // default values
  numRows = numRows ?? 0;
  batchSize = batchSize ?? 1000;
  return loopDefer({
    props: [],
    // setup: (p) => {console.log('setup exec'); return p},
    // because we modify the props rather than reconstructing and returning, we only really need the loop condition
    loopCondition: async (rows) => {
      // calculate number of rows to get, avoid getting more rows than we are asked to get
      const rowsNeeded = numRows === 0 ? batchSize : numRows - rows.length;
      const rowsToGet = Math.min(rowsNeeded, batchSize)

      // get the rows and add them to props.rows.
      const nextBatch = await getRowsPromisified.call(this,rowsToGet);
      const totalRows = rows.push(...nextBatch);

      const getMoreRows = !( // stop only if
        // we requested more than we received (end of result set)
        nextBatch.length < rowsToGet
        // we have received in total the amount we requested (totalRows should be > 0 at this point for the case of wanting all rows)
        || totalRows === numRows
      )
      return getMoreRows
    },
    closure: callback,
    that: this,
  });
}

function extend(resultset, connection, driver) {
  Object.defineProperties(
    resultset,
    {
      _driver: {
        value: driver
      },
      _connection: {
        value: connection
      },
      _close: {
        value: resultset.close
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      },
      _getRows: {
        value: resultset.getRows
      },
      getRows: {
        value: nonBlockingGetRows,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
