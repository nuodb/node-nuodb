// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_NANDATE_H
#define NUOJS_NANDATE_H

#include "NuoJsAddon.h"

namespace NuoJs
{
class NanDate
{
public:
    // Initialize the date constructor.
    static NAN_MODULE_INIT(init);

    static Local<Date> toDate(const char* dateStr);
    static Local<Date> toDate(std::string dateString);
private:
    static Nan::Persistent<Function> constructor;
};
}

#endif
