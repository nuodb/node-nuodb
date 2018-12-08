#ifndef NUOJS_JSON_H
#define NUOJS_JSON_H

// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsAddon.h"

// See: https://github.com/nodejs/node-addon-api/issues/57
namespace NuoJs
{
// getJsonString gets a property identified by key from the object. If the
// key is not present, the default value is returned. If the key is present
// but the type is not a string, the method will throw a std::exception.
std::string getJsonString(Local<Object> object, std::string key, std::string defaultValue);

// getJsonInt gets a property identified by key from the object. If the
// key is not present, the default value is returned. If the key is present
// but the type is not a int, the method will throw a std::exception.
int32_t getJsonInt(Local<Object> object, std::string key, int32_t defaultValue);

// getJsonUint gets a property identified by key from the object. If the
// key is not present, the default value is returned. If the key is present
// but the type is not a uint, the method will throw a std::exception.
uint32_t getJsonUint(Local<Object> object, std::string key, uint32_t defaultValue);

// getJsonBoolean gets a property identified by key from the object. If the
// key is not present, the default value is returned. If the key is present
// but the type is not a bool, the method will throw a std::exception.
bool getJsonBoolean(Local<Object> object, std::string key, bool defaultValue);
}

#endif
