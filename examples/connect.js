var database = require('nuodb');
var config = require('./config.js');

database.connect(
  {
    user: config.user,
    password: config.password,
    connectString: config.connectString
  },
  function (err, connection) {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log('Connection was successful!');

    connection.close(
      function (err) {
        if (err) {
          console.error(err.message);
          return;
        }
      });
  });