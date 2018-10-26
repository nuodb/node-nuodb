var nuodb = require('../');

var config = {};

config.database = 'test';
config.hostname = 'ad1';
config.port = '48004';
config.user = 'dba';
config.password = 'dba';

nuodb.connect(config, function (err, connection) {
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