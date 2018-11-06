# Bugs and Limitations

## NuoDB Bugs and Limitations

1. SIGSEGV when calling any method on an object whose .close method
   has already been called.
2. The getParameterMetaData method returns an interface whose results
   always return NUODB_NULL.
3. NuoDB does not support the international standards for date/time,
   ISO-8601.
4. NuoDB does not support converting from a numeric value to any sort
   of date/time/timestamp. A natural conversion should support millis
   since the common epoch.

## ES Bugs and Limitations

### BIGINT

According to the ECMAScript standard, there is only one number type: the
double-precision 64-bit binary format IEEE 754 value (numbers between
-(2^53 -1) and 2^53 -1). ECMAScript does NOT support 64-bit integers.
As such, BIGINT database types are automatically converted to ECMAScript
String objects.

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
