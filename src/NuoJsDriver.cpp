// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsDriver.h"
#include "NuoJsConnection.h"
#include "NuoJsParams.h"
#include "NuoJsErrMsg.h"

#include "NuoDB.h"

#include <functional>
#include <memory>

namespace NuoJs
{

Nan::Persistent<Function> Driver::constructor;

Driver::Driver()
    : Nan::ObjectWrap()
{
    TRACE("Driver::Driver");
}

/* virtual */
Driver::~Driver()
{
    TRACE("Driver::~Driver");
}

/* static */
NAN_MODULE_INIT(Driver::init)
{
    TRACE("Driver::init");
    Nan::HandleScope scope;

    // prepare constructor template...
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(Driver::newInstance);
    tpl->SetClassName(Nan::New("Driver").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // prototypes...
    Nan::SetPrototypeMethod(tpl, "connect", connect);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New<String>("Driver").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

/* static */
NAN_METHOD(Driver::newInstance)
{
    TRACE("Driver::newInstance");
    Nan::HandleScope scope;
    if (info.IsConstructCall()) {
        Driver* driver = new Driver();
        driver->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    } else {
        Local<Function> cons = Nan::New<Function>(constructor);
        info.GetReturnValue().Set(Nan::NewInstance(cons).ToLocalChecked());
    }
}

class ConnectWorker : public Nan::AsyncWorker
{
public:
    ConnectWorker(Nan::Callback* callback, Driver* driver, Params params)
        : Nan::AsyncWorker(callback), driver(driver), params(params)
    {
        TRACE("ConnectWorker::ConnectWorker");
    }

    virtual ~ConnectWorker()
    {
        TRACE("ConnectWorker::~ConnectWorker");
    }

    virtual void Execute()
    {
        TRACE("ConnectWorker::Execute");
        try {
            connection = driver->doConnect(params);
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errOpen, e.what());
            SetErrorMessage(e.what());
        }
    }

    virtual void HandleOKCallback()
    {
        TRACE("ConnectWorker::HandleOKCallback");
        Nan::HandleScope scope;

        Local<Object> object = Connection::createFrom(connection);
        Local<Value> argv[] = {
            Nan::Null(),
            object
        };
        callback->Call(2, argv, async_resource);
    }
protected:
    Driver* driver;
    Params params;
    NuoDB::Connection* connection;
};

/* static */
NAN_METHOD(Driver::connect)
{
    TRACE("Driver::connect");
    Nan::HandleScope scope;

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }

    if (info[0]->IsFunction()) {
        Nan::ThrowError("connect first arg must not be a function");
        return;
    }

    Nan::Callback* callback = new Nan::Callback(info[1].As<Function>());

    // the es code guarantees that the first arg are connection options

    if (!info[0]->IsObject()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
        Nan::ThrowError(message.c_str());
        return;
    }

    Params params;
    try {
        storeJsonParams(info[0]->ToObject(), params);
    } catch (std::exception& e) {
        std::string message = ErrMsg::get(ErrMsgType::errBadConfiguration, e.what());
        Nan::ThrowError(message.c_str());
        return;
    }

    ConnectWorker* worker = new ConnectWorker(
        callback, Nan::ObjectWrap::Unwrap<Driver>(info.This()), params);
    worker->SaveToPersistent("nuodb:Driver", info.This());
    Nan::AsyncQueueWorker(worker);
}

struct NuoPropertiesDeleter
{
    void operator()(NuoDB::Properties* p)
    {
        p->release();
    }
};

NuoDB::Connection* Driver::doConnect(Params& params)
{
    try {
        NuoDB::Connection* connection = NuoDB::Connection::create();
        std::unique_ptr<NuoDB::Properties, std::function<void(NuoDB::Properties*)> >
        props(connection->allocProperties(), [](NuoDB::Properties* ptr) { ptr->release(); });
        props->putValue("user", params["user"].c_str());
        props->putValue("password", params["password"].c_str());
        props->putValue("schema", params["schema"].c_str());
        std::string connection_string = getConnectionString(params);
        connection->openDatabase(connection_string.c_str(), props.get());
        return connection;
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}
}
