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
    errMissingProperty = 5,
    errInvalidPropertyType = 6,
    errInvalidPropertyValue = 7,
    errBadConfiguration = 8,
    errAlreadyOpen = 9,
    errConnectionClosed = 10,
    errFailedCloseConnection = 11,
    errSqlExecute = 12,
    errInvalidTypeAssignment = 13,

    // New ones should be added here

    errMaxErrors                // Max # of errors plus one
};

class ErrMsg
{
public:
    static std::string get(int err, ...);
};
}

#endif
