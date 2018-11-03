#include <stdio.h>
#include <stdarg.h>

#include "NuoJsErrMsg.h"

namespace NuoJs
{
#define NUOJS_MAX_ERROR_MSG_LEN 256

static const char* errMsg[] = {
    "NUOJS-000: success",                               // errSuccess
    "NUOJS-001: failed to connect [%s]",                // errConnect
    "NUOJS-002: failed to open database [%s]",          // errOpen
    "NUOJS-003: invalid number of parameters [%s]",     // errInvalidParamCount
    "NUOJS-004: invalid type for parameter %d",         // errInvalidParamType
    "NUOJS-005: missing property %s",                   // errMissingProperty
    "NUOJS-006: invalid type for property %s",          // errInvalidPropertyType
    "NUOJS-007: invalid value for property %s",         // errInvalidPropertyValue
    "NUOJS-008: bad configuration [%s]",                // errBadConfiguration
    "NUOJS-009: connection already open",               // errAlreadyOpen
    "NUOJS-010: connection closed",                     // errConnectionClosed
    "NUOJS-011: failed to close connection [%s]",       // errFailedCloseConnection
    "NUOJS-012: failed to execute SQL statement [%s]",  // errSqlExecute
    "NUOJS-013: invalid type in assignment",            // errInvalidTypeAssignment
};

/* static */
std::string ErrMsg::get(int err, ...)
{
    char msg[NUOJS_MAX_ERROR_MSG_LEN + 1];
    va_list vlist;
    std::string str;

    if (err > 0 && err < errMaxErrors) {
        va_start(vlist, err);
        if (vsnprintf(msg, NUOJS_MAX_ERROR_MSG_LEN, errMsg[err], vlist) <= 0) {
            msg[0] = '\0';
        }
        va_end(vlist);
        str = msg;
    }
    return str;
}
}
