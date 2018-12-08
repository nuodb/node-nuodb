// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsJson.h"
#include "NuoJsErrMsg.h"

// See: https://github.com/nodejs/node-addon-api/issues/57
namespace NuoJs
{
std::string getJsonString(Local<Object> object, std::string key, std::string defaultValue)
{
    Nan::EscapableHandleScope scope;
    std::string value = defaultValue;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local)) {
        if (!local->IsString() && !local->IsNullOrUndefined()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        Nan::Utf8String utf8str(local->ToString());
        value = std::string(*utf8str, static_cast<size_t>(utf8str.length()));
    }
    return value;
}

int32_t getJsonInt(Local<Object> object, std::string key, int32_t defaultValue)
{
    Nan::EscapableHandleScope scope;
    int32_t value = defaultValue;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local) && !local->IsNullOrUndefined()) {
        if (!local->IsInt32()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        value = Nan::To<int32_t>(local).FromJust();
    }
    return value;
}

uint32_t getJsonUint(Local<Object> object, std::string key, uint32_t defaultValue)
{
    Nan::EscapableHandleScope scope;
    uint32_t value = defaultValue;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local) && !local->IsNullOrUndefined()) {
        if (!local->IsUint32()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        value = Nan::To<uint32_t>(local).FromJust();
    }
    return value;
}

bool getJsonBoolean(Local<Object> object, std::string key, bool defaultValue)
{
    Nan::EscapableHandleScope scope;
    bool value = defaultValue;
    MaybeLocal<Value> maybe = Nan::Get(object, Nan::New(key).ToLocalChecked());
    Local<Value> local;
    if (maybe.ToLocal(&local) && !local->IsNullOrUndefined()) {
        if (!local->IsBoolean()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
            throw std::runtime_error(message);
        }
        value = local->ToBoolean()->Value();
    }
    return value;
}
}
