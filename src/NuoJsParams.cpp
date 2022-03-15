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

void storeJsonParams(Local<Object> object, Params& params)
{
    Isolate* isolate = Isolate::GetCurrent();
    Local<Context> ctx = isolate->GetCurrentContext();

    // create local array of property names
    MaybeLocal<Array> maybePropertyNames = Nan::GetPropertyNames(object);
    Local<Array> localPropertyNames = maybePropertyNames.ToLocalChecked();

    for(uint32_t i = 0; i < localPropertyNames->Length(); i++){
        // access the key in the array as a string
        MaybeLocal<Value> maybeKey = localPropertyNames->Get(ctx,i);
        Local<Value> localKey = maybeKey.ToLocalChecked();
        Nan::Utf8String keyutf8(localKey->ToString(ctx).ToLocalChecked());
        std::string key(*keyutf8, static_cast<size_t>(keyutf8.length()));

        // placeholder for the property value
        MaybeLocal<Value> maybe = Nan::Get(object, localKey);
        Local<Value> local;

        // if the property is undefined/null ignore it
        if(maybe.ToLocal(&local) && !local->IsNullOrUndefined()){
            // convert the property
            if(local->IsString()){
                Nan::Utf8String utf8str(local->ToString(ctx).ToLocalChecked());
                std::string value(*utf8str, static_cast<size_t>(utf8str.length()));
                params[key.c_str()] = value.c_str();
            } else if(local->IsInt32()) {
                int32_t value = Nan::To<int32_t>(local).FromJust();
                params[key.c_str()] = std::to_string(value).c_str();
            } else {
                // no handling for other property types
                std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
                throw std::runtime_error(message);
            }
        }
    }
}

void checkParam(Params& params, const char* key){
    if(!params.count(key)){
        std::string message = ErrMsg::get(ErrMsgType::errMissingProperty, key);
        throw std::runtime_error(message);
    }
}


std::string getConnectionString(Params& params)
{
    try {
        checkParam(params, "database");
        checkParam(params, "hostname");
        checkParam(params, "port");
        std::ostringstream connection_string;
        connection_string << params["database"] << "@" << params["hostname"] << ":" << params["port"];
        return connection_string.str();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}
} // namespace
