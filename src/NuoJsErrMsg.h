#ifndef NUOJS_ERRMSG_H
#define NUOJS_ERRMSG_H

#include <string>

namespace NuoJs
{
enum ErrMsgType {
    errSuccess = 0,
    errConnect = 1,
    errOpen = 2,
    errInvalidParamCount = 3,
    errInvalidParamType = 4,
    errInvalidParamValue = 5,
    errMissingProperty = 6,
    errInvalidPropertyType = 7,
    errInvalidPropertyValue = 8,
    errBadConfiguration = 9,
    errAlreadyOpen = 10,
    errConnectionClosed = 11,
    errFailedCloseConnection = 12,
    errSqlExecute = 13,
    errInvalidTypeAssignment = 14,
    errConversionUnsafe = 15,
    errFailedCloseResultSet = 16,
    errGetRows = 17,
    errNoStatement = 18,

    // New ones should be added here

    errMaxErrors     // Max # of errors plus one
};

class ErrMsg
{
public:
    static std::string get(int err, ...);
};
}

#endif
