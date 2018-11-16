#ifndef NUOJS_NAPI_EXTENSIONS_H
#define NUOJS_NAPI_EXTENSIONS_H

#include "NuoJsAddon.h"

// See: https://github.com/nodejs/node-addon-api/issues/57
namespace NuoJs
{
// isInt16 determines if the value can be safely represented as a short
inline bool isInt16(const Napi::Env& env, const Napi::Value& num)
{
    double orig = num.As<Napi::Number>().DoubleValue();
    double cast = (double)(int16_t)num.As<Napi::Number>().Int32Value();
    return orig == cast;
}

// isInt32 determines if the value can be represented as a safe integer
inline bool isInt32(const Napi::Env& env, const Napi::Value& num)
{
    double orig = num.As<Napi::Number>().DoubleValue();
    double cast = (double)num.As<Napi::Number>().Int32Value();
    return orig == cast;
}

// isInt32 determines if the value can be represented as a safe integer
inline bool isFloat(const Napi::Env& env, const Napi::Value& num)
{
    double orig = num.As<Napi::Number>().DoubleValue();
    double cast = (double)num.As<Napi::Number>().FloatValue();
    return orig == cast;
}

// IsDate determines if the value can be represented as a date.
inline bool isDate(const Napi::Env& env, Napi::Value& value)
{
    Napi::Function func = env.Global().Get("Date").As<Napi::Function>();
    return value.As<Napi::Object>().InstanceOf(func);
}
}

#endif
