// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsErrMsg.h"

#include <stdio.h>
#include <stdarg.h>
#include <iostream>

namespace NuoJs
{
#define NUOJS_MAX_ERROR_MSG_LEN 512

static const char* errMsg[] = {
    "success",                                                                     // errSuccess
    "{\"Context\": \"failed to connect\", \"Exception\": %s}",                   // errConnect
    "{\"Context\": \"failed to open database\", \"Exception\": %s}",                            // errOpen
    "{\"Context\": \"invalid number of parameters %s\"}",                          // errInvalidParamCount
    "{\"Context\": \"invalid type for parameter %d\"}",                            // errInvalidParamType
    "{\"Context\": \"invalid value for parameter %d\"}",                           // errInvalidParamValue
    "{\"Context\": \"missing property %s\"}",                                      // errMissingProperty
    "{\"Context\": \"invalid type for property %s\"}",                             // errInvalidPropertyType
    "{\"Context\": \"invalid value for property %s\"}",                            // errInvalidPropertyValue
    "{\"Context\": \"bad configuration %s\"}",                                     // errBadConfiguration
    "{\"Context\": \"connection already open\"}",                                  // errAlreadyOpen
    "{\"Context\": \"connection closed\"}",                                        // errConnectionClosed
    "{\"Context\": \"failed to close connection\", \"Exception\": %s}",          // errFailedCloseConnection
    "{\"Context\": \"failed to execute SQL statement\", \"Exception\": %s}",     // errSqlExecute
    "{\"Context\": \"invalid type in assignment\"}",                               // errInvalidTypeAssignment
    "{\"Context\": \"unsafe type conversion to %s will lose precision\"}",         // errConversionUnsafe
    "{\"Context\": \"failed to close result set\", \"Exception\": %s}",          // errFailedCloseResultSet
    "{\"Context\": \"failed to get more result set rows\", \"Exception\": %s}",  // errGetRows
    "{\"Context\": \"statement is not open\"}",                                    // errNoStatement
    "{\"Context\": \"rollback failed\", \"Exception\": %s}",                     // errRollback
    "{\"Context\": \"commit failed\", \"Exception\": %s}",                       // errCommit
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

std::string ErrMsg::get(NuoDB::SQLException &e)
{
	char msg[NUOJS_MAX_ERROR_MSG_LEN + 1];
	std::string str = e.getText();;
        size_t pos = 0;
        while ((pos = str.find("\"", pos)) != std::string::npos) {
            str.replace(pos, 1, "\\\"");
            pos += 2; // Skip the newly inserted backslash and quote
        }
	sprintf(msg,"{\"Type\": \"SQLException\",\"SQLcode\": %d, \"SQLState\": \"%s\", \"Text\": \"%s\"}\n",e.getSqlcode(), e.getSQLState(), str.c_str());
	str = msg;
	return str;
}
}
