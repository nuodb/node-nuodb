// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsErrMsg.h"

#include <stdio.h>
#include <stdarg.h>

namespace NuoJs
{
#define NUOJS_MAX_ERROR_MSG_LEN 256

static const char* errMsg[] = {
    "success",                                            // errSuccess
    "failed to connect [%s]",                             // errConnect
    "failed to open database [%s]",                       // errOpen
    "invalid number of parameters [%s]",                  // errInvalidParamCount
    "invalid type for parameter %d",                      // errInvalidParamType
    "invalid value for parameter %d",                     // errInvalidParamValue
    "missing property %s",                                // errMissingProperty
    "invalid type for property %s",                       // errInvalidPropertyType
    "invalid value for property %s",                      // errInvalidPropertyValue
    "bad configuration [%s]",                             // errBadConfiguration
    "connection already open",                            // errAlreadyOpen
    "connection closed",                                  // errConnectionClosed
    "failed to close connection [%s]",                    // errFailedCloseConnection
    "failed to execute SQL statement [%s]",               // errSqlExecute
    "invalid type in assignment",                         // errInvalidTypeAssignment
    "unsafe type conversion to %s will lose precision",   // errConversionUnsafe
    "failed to close result set [%s]",                    // errFailedCloseResultSet
    "failed to get more result set rows [%s]",            // errGetRows
    "statement is not open",                              // errNoStatement
    "rollback failed [%s]",                               // errRollback
    "commit failed [%s]",                                 // errCommit
};

// See `format`:
// [1] https://gcc.gnu.org/onlinedocs/gcc/Common-Function-Attributes.html#Common-Function-Attributes
// [2] https://stackoverflow.com/questions/30393665/how-to-detect-implicit-conversion-in-vsnprintf-by-gcc
// [3] https://codereview.stackexchange.com/questions/115760/use-va-list-to-format-a-string
// [4] http://www.zverovich.net/2015/04/22/compile-time-checking-of-printf-args-in-cppformat.html

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
