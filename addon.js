var addon = module.exports = require('bindings')('addon.node');

// var Database = addon.Database;

// Database.prototype.connectSync = function(params) {
//   this.connected = true;
//   this.$connect(params, cb);
// }

// Database.prototype.connect = function (config) {
//   return new Promise((resolve, reject) => {
//     this.connect(config, (error) => {
//       if (error) {
//         reject(error);
//       } else {
//         resolve();
//       }
//     });
//   });
// };

// Database.prototype.release = function(cb) {
//   this.connected = false;
//   this.$release(cb);
// };
