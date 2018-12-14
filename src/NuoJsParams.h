// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_PARAMS_H
#define NUOJS_PARAMS_H

#include "NuoJsAddon.h"

#include <string>
#include <unordered_map>

namespace NuoJs
{
// Params represents the database connection credentials and properties.
typedef std::unordered_map<std::string, std::string> Params;

// getJsonParams returns the JSON parameters provided by the user.
void storeJsonParams(Local<Object> obj, Params& params);

// getConnectionString forms a connection string from the provided parameters.
std::string getConnectionString(Params& params);
}

#endif
