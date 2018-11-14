#include "NuoJsJson.h"
#include "NuoJsErrMsg.h"
#include <stdio.h>

namespace NuoJs
{
Napi::Value getJsonValue(Napi::Env env, Napi::Object object, std::string key)
{
    if (!object.Has(key)) {
        return env.Undefined();
    }
    return object[key];
}

Napi::Value getJsonNumber(Napi::Env env, Napi::Object object, std::string key)
{
    Napi::Value value = getJsonValue(env, object, key);
    if (!value.IsNumber()) {
        return env.Undefined();
    }
    return value.ToNumber();
}

Napi::Value getJsonString(Napi::Env env, Napi::Object object, std::string key)
{
    Napi::Value value = getJsonValue(env, object, key);
    if (!value.IsString()) {
        return env.Undefined();
    }
    return value.ToString();
}

Napi::Value getJsonBoolean(Napi::Env env, Napi::Object object, std::string key)
{
    Napi::Value value = getJsonValue(env, object, key);
    if (!value.IsBoolean()) {
        return env.Undefined();
    }
    return value.ToBoolean();
}
}
