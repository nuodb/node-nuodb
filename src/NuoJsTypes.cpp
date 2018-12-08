// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsTypes.h"
#include "NuoDB.h"

namespace NuoJs
{
using namespace NuoDB;

int typeOf(Local<Value> v)
{
    if (v->IsNumber()) {
        return ES_NUMBER;
    } else if (v->IsString()) {
        return ES_STRING;
    } else if (v->IsFunction()) {
        // This test has to come before IsObject because IsFunction
        // implies IsObject
        return ES_FUNCTION;
    } else if (v->IsExternal()) {
        // This test has to come before IsObject because IsExternal
        // implies IsObject
        return ES_EXTERNAL;
    } else if (v->IsObject()) {
        return ES_OBJECT;
    } else if (v->IsBoolean()) {
        return ES_BOOLEAN;
    } else if (v->IsUndefined()) {
        return ES_UNDEFINED;
    } else if (v->IsSymbol()) {
        return ES_SYMBOL;
    } else if (v->IsNull()) {
        return ES_NULL;
    } else {
        // Should not get here unless V8 has added some new kind of value.
        throw std::runtime_error("unknown ES type");
    }
}

// reduceSqlType SQL type reduction
int Type::reduceSqlType(int type)
{

    switch (type) {
        case NUOSQL_NULL:
            return NUOSQL_NULL;
            break;

        // NUOSQL_BIT: <- undocumented type
        // NUOSQL_TINYINT: <- undocumented type
        case NUOSQL_SMALLINT:
        case NUOSQL_INTEGER:
        case NUOSQL_FLOAT: // AN ALIAS FOR DOUBLE!!!
        case NUOSQL_DOUBLE:
            return NUOSQL_DOUBLE;
            break;

        // case NUOSQL_BIGINT: // <- ES does not support 64-bit integers, so we have to handle as special case

        case NUOSQL_CHAR:
        case NUOSQL_VARCHAR:
        case NUOSQL_LONGVARCHAR:
            return NUOSQL_VARCHAR;
            break;

        // NUOSQL_DATE:
        // NUOSQL_TIME:
        // NUOSQL_TIMESTAMP:
        // NUOSQL_BLOB:
        // NUOSQL_CLOB:
        // NUOSQL_NUMERIC:
        // NUOSQL_DECIMAL:
        case NUOSQL_BOOLEAN:
            return NUOSQL_BOOLEAN;
            break;

        // NUOSQL_BINARY:
        // NUOSQL_LONGVARBINARY:
        default:
            return NUOSQL_UNDEFINED;
    }
}

int Type::toEsType(int type)
{
    switch (reduceSqlType(type)) {
        case NUOSQL_NULL:
            return EsType::ES_NULL;
            break;

        case NUOSQL_DOUBLE:
            return EsType::ES_NUMBER;
            break;

        case NUOSQL_VARCHAR:
            return EsType::ES_STRING;
            break;

        case NUOSQL_BOOLEAN:
            return EsType::ES_BOOLEAN;
            break;

        default:
            return EsType::ES_UNDEFINED;
    }
}

int Type::fromEsType(int type)
{
    switch (type) {
        case EsType::ES_NULL:
            return NUOSQL_NULL;
            break;

        case EsType::ES_NUMBER:
            return NUOSQL_DOUBLE;
            break;

        case EsType::ES_STRING:
            return NUOSQL_VARCHAR;
            break;

        case EsType::ES_BOOLEAN:
            return NUOSQL_BOOLEAN;
            break;

        default:
            return NUOSQL_UNDEFINED;
    }
}
} // end namespace
