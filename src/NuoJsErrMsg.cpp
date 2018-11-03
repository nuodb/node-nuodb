#include <stdio.h>
#include <stdarg.h>

#include "NuoJsErrMsg.h"

namespace NuoJs
{
#define NUOJS_MAX_ERROR_MSG_LEN 256

static const char* errMsg[] = {
    "success",                               // errSuccess
    "failed to connect [%s]",                // errConnect
    "failed to open database [%s]",          // errOpen
    "invalid number of parameters [%s]",     // errInvalidParamCount
    "invalid type for parameter %d",         // errInvalidParamType
    "missing property %s",                   // errMissingProperty
    "invalid type for property %s",          // errInvalidPropertyType
    "invalid value for property %s",         // errInvalidPropertyValue
    "bad configuration [%s]",                // errBadConfiguration
    "connection already open",               // errAlreadyOpen
    "connection closed",                     // errConnectionClosed
    "failed to close connection [%s]",       // errFailedCloseConnection
    "failed to execute SQL statement [%s]",  // errSqlExecute
    "invalid type in assignment",            // errInvalidTypeAssignment
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
