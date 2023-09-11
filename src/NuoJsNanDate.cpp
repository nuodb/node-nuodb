// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsNanDate.h"

namespace NuoJs
{
Nan::Persistent<Function> NanDate::constructor;

/* static */
NAN_MODULE_INIT(NanDate::init)
{
    TRACE("ResultSet::init");
    Nan::HandleScope scope;

    Local<Date> tmp = Nan::New<Date>(0).ToLocalChecked();
    Local<Function> cons = Local<Function>::Cast(
        Nan::Get(tmp, Nan::New("constructor").ToLocalChecked()).ToLocalChecked());
    constructor.Reset(cons);
}

Local<Date> NanDate::toDate(const char* dateStr)
{
    Nan::EscapableHandleScope scope;
    const int argc = 1;
    Local<Value> argv[argc] = { Nan::New(dateStr).ToLocalChecked() };

    Local<Function> cons = Nan::New<Function>(constructor);
    Local<Date> date = Local<Date>::Cast(
        Nan::NewInstance(cons, argc, argv).ToLocalChecked()
        );
    return scope.Escape(date);
}

Local<Date> NanDate::toDate(std::string dateString)
{
    return toDate(dateString.c_str());
}
}
