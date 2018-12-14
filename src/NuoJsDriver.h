// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_DRIVER_H
#define NUOJS_DRIVER_H

#include "NuoJsAddon.h"
#include "NuoJsParams.h"

namespace NuoJs
{
class Driver : public Nan::ObjectWrap
{
public:
    Driver();
    virtual ~Driver();

    static NAN_MODULE_INIT(init);

    static NAN_METHOD(newInstance);

private:

    static NAN_METHOD(connect);
    friend class ConnectWorker;
    NuoDB::Connection* doConnect(Params& params);

    static Nan::Persistent<Function> constructor;
};
}

#endif
