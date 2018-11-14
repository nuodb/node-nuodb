#ifndef NUOJS_JSON_H
#define NUOJS_JSON_H

#include "NuoJsAddon.h"

namespace NuoJs
{
// getJsonBoolean gets a Boolean value from a JSON object.
Napi::Value getJsonBoolean(Napi::Env env, Napi::Object object, std::string key);

// getJsonNumber gets a Number value from a JSON object.
Napi::Value getJsonNumber(Napi::Env env, Napi::Object object, std::string key);

// getJsonString gets a string value from a JSON object.
Napi::Value getJsonString(Napi::Env env, Napi::Object object, std::string key);
}

#endif
