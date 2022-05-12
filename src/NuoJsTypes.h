// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_TYPES_H
#define NUOJS_TYPES_H

#include "NuoJsAddon.h"

namespace NuoDB
{
// The NuoDB SQL type enumeration is unstructured, and lacks sentinel values
// for UNDEFINED datatypes. NuoDB does not support OBJECT, so for arbitrary
// values in the ES type system, there is no clear mapping. For type coercion,
// UNDEFINED indicates that no known mapping exists, which means that greater
// attention to object type needs to be performed in order to safely represent
// in database terms (think ES Dates).
const int NUOSQL_UNDEFINED = INT32_MAX;
}

namespace NuoJs
{
enum EsType
{
    ES_UNDEFINED,
    ES_NULL,
    ES_BOOLEAN,
    ES_NUMBER,
    ES_STRING,
    ES_SYMBOL,
    ES_OBJECT,
    ES_DATE,
    ES_FUNCTION,
    ES_EXTERNAL,
};

int typeOf(Local<Value> value);

// The MAX_SAFE_INTEGER constant represents the maximum safe integer in
// JavaScript (2^53 - 1).
#define MAX_SAFE_INTEGER 9007199254740991

// The MIN_SAFE_INTEGER constant represents the minimum safe integer in
// JavaScript (-(2^53 - 1)).
#define MIN_SAFE_INTEGER -MAX_SAFE_INTEGER

// Type handles type conversion for SQL and ES data types.
class Type
{
public:
    // reduceSqlType performs a reduction on SQL types.
    //
    // ES supports few data types, while SQL has a rich type system. In order
    // to coerce SQL types into ES types, a reduction occurs to coerce several
    // SQL types into a more limited range of types. e.g. INT maps to DOUBLE.
    // The primary purpose of this method is for result set handling; result
    // set metadata identifies the types returned, then we coerce the types to
    // those types directly representable in the ES type system.
    static int reduceSqlType(int);

    // toEsType maps from SQL types to ES types. toEsType calls mapType on any
    // input to reduce to directly mappable SQL types.
    static int toEsType(int);

    // fromEsType maps from ES types to SQL types.
    static int fromEsType(int);

private:
    // Prevent construction.
    Type() {}
};
}

#endif
