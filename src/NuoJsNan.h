// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_NAN_H
#define NUOJS_NAN_H

#include "NuoJsAddon.h"

// See: https://github.com/nodejs/node-addon-api/issues/57
namespace NuoJs
{
// Must call v->IsBoolean() first
bool toBool(Local<Value> value);

// Must call v->IsInt16() first
int16_t toInt16(Local<Value> value);

// Must call v->IsInt32() first
int32_t toInt32(Local<Value> value);

// Must call v->IsInt64() first
int64_t toInt64(Local<Value> value);

// Must call v->IsNumber() first
float toFloat(Local<Value> value);

// Must call v->IsNumber() first
double toDouble(Local<Value> value);

// Must call v->IsString() first
std::string toString(Local<Value> value);

// isInt16 determines if the value can be safely represented as a short
bool isInt16(Local<Value> num);

// isInt32 determines if the value can be represented as a safe integer
bool isInt32(Local<Value> num);

// isInt32 determines if the value can be represented as a safe integer
bool isFloat(Local<Value> num);

// IsDate determines if the value can be represented as a date.
bool isDate(Local<Value> value);
} // namespace NuoJs

#endif
