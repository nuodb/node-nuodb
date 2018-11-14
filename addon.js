module.exports = nuodb = require('bindings')('nuodb.node');

function extend(nuodb) {
  Object.defineProperties(nuodb, {
    ROWS_AS_ARRAY: {
      value: 0,
      enumerable: true
    },
    ROWS_AS_OBJECT: {
      value: 1,
      enumerable: true
    }
  });
}

extend(nuodb);