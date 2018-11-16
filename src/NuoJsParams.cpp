#include "NuoJsParams.h"
#include "NuoJsErrMsg.h"

#include <sstream>
#include <iostream>

namespace NuoJs
{
using namespace Napi;

Napi::Value getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key)
{
    if (!object.Has(key)) {
        std::string message = ErrMsg::get(ErrMsgType::errMissingProperty, key.c_str());
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Value value = object[key];
    if (!value.IsString()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, key.c_str());
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return value.ToString();
}

void getJsonParamOrDefault(Napi::Env env, Napi::Object object, Params& params, std::string key, std::string defaultValue)
{
    std::string value = defaultValue;
    if (object.Has(key)) {
        value = getNamedPropertyString(env, object, key).ToString();
    }
    params[key] = value;
}

void getJsonParam(Napi::Env env, Napi::Object object, Params& params, std::string key, bool required)
{
    if (object.Has(key)) {
        params[key] = getNamedPropertyString(env, object, key).ToString();
    } else if (required) {
        std::string message = ErrMsg::get(ErrMsgType::errMissingProperty, key.c_str());
        throw std::runtime_error(message);
    }
}

void getJsonParams(Napi::Env env, Napi::Object object, Params& params)
{
    // get the database name (required)
    getJsonParam(env, object, params, "database", true);
    // get the user name (required)
    getJsonParam(env, object, params, "user", true);
    // get the password (required)
    getJsonParam(env, object, params, "password", true);

    // get the host name (optional, default to localhost)
    getJsonParamOrDefault(env, object, params, "hostname", "localhost");
    // get the port (optional, default to 48004)
    getJsonParamOrDefault(env, object, params, "port", "48004");
    // get the schema (optional, default is USER)
    getJsonParamOrDefault(env, object, params, "schema", "USER");
}

std::string getConnectionString(Params& params)
{
    std::ostringstream connection_string;
    connection_string << params["database"] << "@" << params["hostname"] << ":" << params["port"];
    return connection_string.str();
}
} // namespace
