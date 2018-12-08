// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsParams.h"
#include "NuoJsErrMsg.h"
#include "NuoJsJson.h"

#include <sstream>
#include <iostream>

namespace NuoJs
{
void storeJsonParam(Local<Object> object, Params& params, std::string key, bool required)
{
    Nan::HandleScope scope;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local)) {
        if (!local->IsString()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        Nan::Utf8String utf8str(local->ToString());
        params[key] = std::string(*utf8str, static_cast<size_t>(utf8str.length()));
    } else if (required) {
        std::string message = ErrMsg::get(ErrMsgType::errMissingProperty, key.c_str());
        throw std::runtime_error(message);
    }
}

void storeJsonParamDefault(Local<Object> object, Params& params, std::string key, std::string value)
{
    Nan::HandleScope scope;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local)) {
        if (!local->IsString()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        Nan::Utf8String utf8str(local->ToString());
        value = std::string(*utf8str, static_cast<size_t>(utf8str.length()));
    }
    params[key] = value;
}

void storeJsonParams(Local<Object> object, Params& params)
{
    // get the database name (required)
    storeJsonParam(object, params, "database", true);
    // get the user name (required)
    storeJsonParam(object, params, "user", true);
    // get the password (required)
    storeJsonParam(object, params, "password", true);

    // get the host name (optional, default to localhost)
    storeJsonParamDefault(object, params, "hostname", "localhost");
    // get the schema (optional, default is USER)
    storeJsonParamDefault(object, params, "schema", "USER");
    // get the port (optional, default to 48004)
    params["port"] = std::to_string(getJsonInt(object, "port", 48004));
}

std::string getConnectionString(Params& params)
{
    std::ostringstream connection_string;
    connection_string << params["database"] << "@" << params["hostname"] << ":" << params["port"];
    return connection_string.str();
}
} // namespace
