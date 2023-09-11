// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsNan.h"

// See: https://github.com/nodejs/node-addon-api/issues/57
namespace NuoJs
{
// Must call v->IsBoolean() first
bool toBool(Local<Value> value)
{
    Nan::Maybe<bool> maybe = Nan::To<bool>(value);
    return maybe.FromJust();
}

// Must call v->IsInt16() first
int16_t toInt16(Local<Value> value)
{
    return (int16_t) toInt32(value);
}

// Must call v->IsInt32() first
int32_t toInt32(Local<Value> value)
{
    Nan::Maybe<int32_t> maybe = Nan::To<int32_t>(value);
    return maybe.FromJust();
}

// Must call v->IsInt64() first
int64_t toInt64(Local<Value> value)
{
    Nan::Maybe<int64_t> maybe = Nan::To<int64_t>(value);
    return maybe.FromJust();
}

// Must call v->IsNumber() first
float toFloat(Local<Value> value)
{
    return (float) toDouble(value);
}

// Must call v->IsNumber() first
double toDouble(Local<Value> value)
{
    Nan::Maybe<double> maybe = Nan::To<double>(value);
    return maybe.FromJust();
}

// Must call v->IsString() first
std::string toString(Local<Value> value)
{
    Nan::Utf8String sqlString(value.As<String>());
    return std::string(*sqlString);
}

// isInt16 determines if the value can be safely represented as a short
bool isInt16(Local<Value> num)
{
    double orig = toDouble(num);
    double cast = (double)(int16_t)toInt32(num);
    return orig == cast;
}

// isInt32 determines if the value can be represented as a safe integer
bool isInt32(Local<Value> num)
{
    double orig = toDouble(num);
    double cast = (double)toInt32(num);
    return orig == cast;
}

// isInt32 determines if the value can be represented as a safe integer
bool isFloat(Local<Value> num)
{
    double orig = toDouble(num);
    double cast = (double)(float)toDouble(num);
    return orig == cast;
}

// IsDate determines if the value can be represented as a date.
bool isDate(Local<Value> value)
{
    return value->IsDate();
}
} // namespace NuoJs
