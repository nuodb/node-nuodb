var should = require('should');
var now = Date();
const testCases = [
  {
    type: 'BINARY',
    data: [
      0,
      1,
      10,
      16
    ],
    checkResults: (rows) => {
      // nuodb returns each byte as a string in hexadecimal format, nodejs converts strings to decimal by default
      // Using string constants here to avoid needing to include an additional library for this test.
      (rows).should.containEql({F1:'00'});
      (rows).should.containEql({F1:'01'});
      (rows).should.containEql({F1:'0A'});
      (rows).should.containEql({F1:'10'});
    }
  },
  {
    type: 'VARBINARY(4)',
    tableName: 'test_var_bin',
    data: [
      "1234",
      "abcd",
    ],
    checkResults: (rows) => {
      // nuodb returns the string data as a string in hexadecimal format, nodejs converts strings to decimal by default
      // Using string constants here to avoid needing to include an additional library for this test.
      (rows).should.containEql({F1:'31323334'});
      (rows).should.containEql({F1:'61626364'});
    }
  },
  {
    type: 'DECIMAL(6,2)',
    tableName: 'test_decimal',
    data: [
      "1234.12",
      "-1234.12",
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:"1234.12"});
      (rows).should.containEql({F1:"-1234.12"});
    }
  },
  {
    type: 'NUMERIC(6,2)',
    tableName: 'test_numeric',
    data: [
      "1234.12",
      "-1234.12",
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:"1234.12"});
      (rows).should.containEql({F1:"-1234.12"});
    }
  },
  {
    type: 'BLOB',
    data: [
      "1234",
      "abcd",
      null,
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:'31323334'});
      (rows).should.containEql({F1:'61626364'});
      (rows).should.containEql({F1: null});
    }
  },
  {
    type: 'CLOB',
    data: [
      null,
      "",
      "hello world",
      "emoji: 🐛"
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:"hello world"});
      (rows).should.containEql({F1:""});
      (rows).should.containEql({F1: null});
      (rows).should.containEql({F1: "emoji: 🐛"});
    }
  },
  {
    type: 'STRING',
    data: [
      null,
      "",
      "hello world",
      "emoji: 🐛"
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:"hello world"});
      (rows).should.containEql({F1:""});
      (rows).should.containEql({F1: null});
      (rows).should.containEql({F1: "emoji: 🐛"});
    }
  },
  {
    type: 'STRING',
    description: 'undefined does not convert to string "undefined"',
    tableName: 'undefined_string',
    data: [
      undefined,
      "",
      "hello world",
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:"hello world"});
      (rows).should.containEql({F1:""});
      (rows).should.containEql({F1: null});
      (rows).should.not.containEql({F1:'undefined'});
      (rows).should.not.containEql({F1:'UNDEFINED'});
    }
  },
  {
    type: 'STRING',
    tableName: 'undefined_string_default',
    tableCreate: "create table if not exists undefined_string_default (F2 int, F1 STRING default 'default')",
    tableInsert: "insert into undefined_string_default (F2) values (?)",
    description: "undefined converts to default value",
    data: [
      [0],
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: "default"});
      (rows).should.not.containEql({F1:null});
      (rows).should.not.containEql({F1:'undefined'});
      (rows).should.not.containEql({F1:'UNDEFINED'});
    }
  },
  {
    type: 'BOOLEAN',
    data:[
      0,
      1,
      false,
      true
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: true});
      (rows).should.containEql({F1: false});
    }
  },
  {
    type: 'SMALLINT',
    data: [
      0,
      1,
      -128,
      127,
      -32768,
      32767
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: 0});
      (rows).should.containEql({F1: 1});
      (rows).should.containEql({F1: -128});
      (rows).should.containEql({F1: 127});
      (rows).should.containEql({F1: -32768});
      (rows).should.containEql({F1: 32767});
    }
  },
  {
    type: 'INTEGER',
    data: [
      0,
      1,
      -128,
      127,
      -32768,
      32767,
      -2147483648,
      2147483647
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: 0});
      (rows).should.containEql({F1: 1});
      (rows).should.containEql({F1: -128});
      (rows).should.containEql({F1: 127});
      (rows).should.containEql({F1: -32768});
      (rows).should.containEql({F1: 32767});
      (rows).should.containEql({F1: -2147483648});
      (rows).should.containEql({F1: 2147483647});
    }
  },
  {
    type: 'BIGINT',
    data: [
      0,
      9007199254740990,
      -9007199254740990,
      '-9223372036854775808',
      '9223372036854775807',
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: 0});
      (rows).should.containEql({F1: 9007199254740990});
      (rows).should.containEql({F1: -9007199254740990});
      (rows).should.containEql({F1: '-9223372036854775808'});
      (rows).should.containEql({F1: '9223372036854775807'});
    }
  },
  {
    type: 'DOUBLE',
    data: [
      0,
      -2.2250738585072014E-308,
      1.7976931348623157E+308,
      -1.7976931348623157E+308,
      2.2250738585072014E-308,
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1:0});
      (rows).should.containEql({F1:-2.2250738585072014E-308});
      (rows).should.containEql({F1:1.7976931348623157E+308});
      (rows).should.containEql({F1:-1.7976931348623157E+308});
      (rows).should.containEql({F1:2.2250738585072014E-308});
    }
  },
  {
    type: 'TIMESTAMP',
    data: [
      new Date(-100000000),
      new Date(0),
      new Date(10000000000),
      new Date(100000000000),
      new Date(1995, 11, 17),
      new Date('1995-12-17T03:24:00'),
      new Date('2015-07-23 21:00:00'),
      new Date('2015-07-23 22:00:00'),
      new Date('2015-07-23 23:00:00.789123'),
      new Date('2015-07-24 00:00:00.456789'),
      new Date('2015-07-23 12:34:56.123456'),
      new Date('2023-09-16T07:36:49.693Z'),
      new Date(now),
    ],
    checkResults: (rows) => {
      (rows).should.containEql({F1: new Date(-100000000)});
      (rows).should.containEql({F1: new Date(0)});
      (rows).should.containEql({F1: new Date(10000000000)});
      (rows).should.containEql({F1: new Date(100000000000)});
      (rows).should.containEql({F1: new Date(1995, 11, 17)});
      (rows).should.containEql({F1: new Date('1995-12-17T03:24:00')});
      (rows).should.containEql({F1: new Date('2015-07-23 21:00:00')});
      (rows).should.containEql({F1: new Date('2015-07-23 22:00:00')});
      (rows).should.containEql({F1: new Date('2015-07-23 23:00:00.789123')});
      (rows).should.containEql({F1: new Date('2015-07-24 00:00:00.456789')});
      (rows).should.containEql({F1: new Date('2015-07-23 12:34:56.123456')});
      (rows).should.containEql({F1: new Date('2023-09-16T07:36:49.693Z')});
      (rows).should.containEql({F1: new Date(now)});
    }
  },
  {
    type: 'DATE',
    data: [
      '09/08/2013',
      '9/8/2013',
      '2013-09-08',
      '2013.8.9',
      '8.9.13',
      'September 8, 13',
      'Sep 08 2013',
      'September 08 2013',
      '08/Sep/2013',
      '8/Sept/13',
      '20130908',
    ],
    checkResults: (rows) => {
      for (const date of rows){
        should.equal(date['F1'].getTime(), 1378598400000);
      }
    }
  },
  {
    type: 'TIME',
    data: [
      '23:11:00.000000',
      '23:11:00',
      '11:11 PM',
    ],
    checkResults: (rows) => {
      for (var time of rows){
        const dateObj = time["F1"];
        /**
         * Time is written and read from the db in local time (and interpretted as such by node).
         * using toLocaleString causes time zone formatting differences between regions
         * using toISOString will cause differences between time zones as different regions 11:11 PM is a different time in UTC
         * Comparing the raw hours/minutes will allow us to keep the result of this test consistent across time zones.
        */
        should.equal(dateObj.getHours(),23);
        should.equal(dateObj.getMinutes(),11);
      }
    }

  },
]

exports.testCases = testCases;
