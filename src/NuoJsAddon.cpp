// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsAddon.h"
#include "NuoJsNanDate.h"
#include "NuoJsDriver.h"
#include "NuoJsConnection.h"
#include "NuoJsResultSet.h"

NAN_MODULE_INIT(initModule)
{
    TRACE("initModule");
    NuoJs::NanDate::init(target);
    NuoJs::Driver::init(target);
    NuoJs::Connection::init(target);
    NuoJs::ResultSet::init(target);
}

NODE_MODULE(nuodb, initModule)
