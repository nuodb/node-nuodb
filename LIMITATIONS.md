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
5. NuoDB does not always return column names with metadata returned
   with the result set. e.g. try `select 1 from dual`, which fails
   to return column names. It should return at least the DUAL table
   DUMMY column name.
6. Documentation for DOUBLE types is incorrect; the range of values,
   if used, will result in numeric overflow.

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

## NuoDB Core Dumps

### Mutex Assert on Close

```
ASSERT: /space/builds/RELEASE-PACKAGE48-RELEASELINUXTARBALL/Alpha/Foundation/Mutex.cpp:52: FAILED: ret == 0
*** Stacktrace:
0x7fbda0505687
0x7fbda050571e
0x7fbda04abc8d
0x7fbda04cd5d0
0x7fbda04cca38
0x7fbda04cac6b
0x7fbda048da48
0x7fbda0686451 NuoJs::Connection::doClose()+65
0x7fbda068c2d7 NuoJs::CloseAsyncWorker::Execute()+23
0x7fbda068b707 Napi::AsyncWorker::OnExecute(napi_env__*, void*)+23
0x9b31c1
0x7fbda2c7ae25
0x7fbda29a4bad clone+109
```

```
doConnect
Error: failed to open database [no NuoDB nodes are available for database "test@ad1:48004"]
    at Context.<anonymous> (/usr/src/nuodb/test/promises.js:10:11)
    at callFnAsync (/usr/src/nuodb/node_modules/mocha/lib/runnable.js:400:21)
    at Test.Runnable.run (/usr/src/nuodb/node_modules/mocha/lib/runnable.js:342:7)
    at Runner.runTest (/usr/src/nuodb/node_modules/mocha/lib/runner.js:455:10)
    at /usr/src/nuodb/node_modules/mocha/lib/runner.js:573:12
    at next (/usr/src/nuodb/node_modules/mocha/lib/runner.js:369:14)
    at /usr/src/nuodb/node_modules/mocha/lib/runner.js:379:7
    at next (/usr/src/nuodb/node_modules/mocha/lib/runner.js:303:14)
    at Immediate._onImmediate (/usr/src/nuodb/node_modules/mocha/lib/runner.js:347:5)
    at runCallback (timers.js:810:20)
    at tryOnImmediate (timers.js:768:5)
    at processImmediate [as _immediateCallback] (timers.js:745:5)
(node:198) UnhandledPromiseRejectionWarning: AssertionError: expected Error {
  message: 'failed to open database [no NuoDB nodes are available for database "test@ad1:48004"]'
} to not exist
    at /usr/src/nuodb/test/promises.js:21:20
    at <anonymous>
    at runMicrotasksCallback (internal/process/next_tick.js:122:5)
    at _combinedTickCallback (internal/process/next_tick.js:132:7)
    at process._tickCallback (internal/process/next_tick.js:181:9)
(node:198) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 4)
(node:198) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```