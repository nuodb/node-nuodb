#include "NuoJsTypes.h"
#include "ResultSetMetaData.h"

namespace NuoJs
{
using namespace NuoDB;

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
        case NUOSQL_BIGINT: // <- ES does not support 64-bit integers, so we have to handle as special case
        case NUOSQL_FLOAT:
        case NUOSQL_DOUBLE:
            return NUOSQL_DOUBLE;
            break;

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
            return NUOSQL_VARCHAR;
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
