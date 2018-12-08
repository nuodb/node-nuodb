# Bugs and Limitations

### TIME

According to the ECMAScript standard, there is no support for a Time
type, and Date does not accept time stamps only. Therefore, in the
driver we represent all TIME objects as ES Dates, but having a common
date being the common epoch (1970-01-01).

### BIGINT

According to the ECMAScript standard, there is only one number type: the
double-precision 64-bit binary format IEEE 754 value (numbers between
-(2^53 -1) and 2^53 -1). ECMAScript does NOT support 64-bit integers.
As such, BIGINT database types are automatically converted to ECMAScript
String objects for those values that are not safely represented as a
Number. See Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER.

Users may install auxiliary packages (such as node-int64, node-bigint,
bignum, or int64) to work with large integers, converting the string
representation to any one of these packages.

### ES Number

The largest safe integer that can be represented in a Number is
9007199254740991, whereas the largest safe integer that can be
represented in BIGINT is 9223372036854775807. Code can be written in JS
where the max value for BIGINT is assigned to a varible. ES will NOT ERROR
about the loss of precision. If numbers larger than Number.MAX_SAFE_INTEGER
are to be handled, they MUST be handled as a String and passed to BIGINT
columns.

Numbers between (2^32 -1) and (2^53 -1)) MUST also be stored in BIGINT
columns.
