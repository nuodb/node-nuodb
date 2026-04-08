// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsDriver.h"
#include "NuoJsConnection.h"
#include "NuoJsParams.h"
#include "NuoJsErrMsg.h"
#include <functional>
#include <memory>
#include <chrono>
#include <thread>
#include <string>
#include <ctime>
#include <algorithm>
#include <iomanip>
#include <sstream>

#include "NuoDB.h"
#include "NuoJsData.h"

using namespace std;

namespace NuoJs
{

std::string format_time_point(std::chrono::system_clock::time_point tp) {
    std::time_t t = std::chrono::system_clock::to_time_t(tp);
    // Use localtime() for local time zone, or gmtime() for UTC
    // Note: localtime() and gmtime() are not thread-safe; use localtime_s/localtime_r
    // or gmtime_s/gmtime_r for thread-safe alternatives where available.
    std::tm tm_struct = *std::localtime(&t);

    std::ostringstream oss;
    // Format the time as "YYYY-MM-DD HH:MM:SS"
    oss << std::put_time(&tm_struct, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

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
    (void) NuoJsDataManager::getInstance(true);

    // prepare constructor template...
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(Driver::newInstance);
    tpl->SetClassName(Nan::New("Driver").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // prototypes...
    Nan::SetPrototypeMethod(tpl, "connect", connect);
    Nan::SetMethod(tpl, "getAsyncJSON", GetAsyncJSON);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New<String>("Driver").ToLocalChecked(), Nan::GetFunction(tpl).ToLocalChecked());
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
        data = manager.getData();
        COUNT_ADD(data, CONNECT_CNT);
    }

    virtual ~ConnectWorker()
    {
        TRACE("ConnectWorker::~ConnectWorker");
        COUNT_SUB(data, CONNECT_CNT);
    }

    virtual void Execute()
    {
        TRACE("ConnectWorker::Execute");
        try {
          ADD_COUNT(CONNECT_DO, DO, data)
          SUBTRACT_COUNT(CONNECT_DO, DO, data)
          connection = driver->doConnect(params);
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errOpen, e.what());
            SetErrorMessage(e.what());
	    SUBTRACT_COUNT(CONNECT_QUE, QUE, data);
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
        SUBTRACT_COUNT(CONNECT_QUE, QUE, data)
        callback->Call(2, argv, async_resource);
    }

    NuoJsData* data;

protected:
    NuoJsDataManager& manager = NuoJsDataManager::getInstance(false);
    Driver* driver;
    Params params;
    NuoDB::Connection* connection;
};

/* static */
NAN_METHOD(Driver::connect)
{
    TRACE("Driver::connect");
    Nan::HandleScope scope;
    Isolate* isolate = Isolate::GetCurrent();
    Local<Context> ctx = isolate->GetCurrentContext();

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
        storeJsonParams(info[0]->ToObject(ctx).ToLocalChecked(), params);
    } catch (std::exception& e) {
        std::string message = ErrMsg::get(ErrMsgType::errBadConfiguration, e.what());
        Nan::ThrowError(message.c_str());
        return;
    }

    ConnectWorker* worker = new ConnectWorker( callback, Nan::ObjectWrap::Unwrap<Driver>(info.This()), params);
    worker->SaveToPersistent("nuodb:Driver", info.This());
    Nan::AsyncQueueWorker(worker);
    ADD_COUNT(CONNECT_QUE,QUE,worker->data);
}


// Function to create a JSON-like V8 object
NAN_METHOD(Driver::GetAsyncJSON) {
  try {
    NuoJsDataManager& manager = NuoJsDataManager::getInstance(false);
    NuoJsData* data = manager.getData();

    v8::Local<v8::Object> resultObj = Nan::New<v8::Object>();
    Nan::Set(resultObj, Nan::New("timestamp").ToLocalChecked(), Nan::New(format_time_point(chrono::system_clock::now())).ToLocalChecked()); 
    v8::Local<v8::Array> jsonArray = Nan::New<v8::Array>(data->count.load(std::memory_order_relaxed)-1);

        // Create the named array of objects
        for (unsigned long i = 1; i < data->count.load(std::memory_order_relaxed); ++i) {
            v8::Local<v8::Object> item = Nan::New<v8::Object>();
            Nan::Set(item, Nan::New("name").ToLocalChecked(), Nan::New<v8::String>(NuoJsDataNamesStrings.at(i)).ToLocalChecked());
            Nan::Set(item, Nan::New("current").ToLocalChecked(), Nan::New<v8::Number>(data->names[i].current.load(std::memory_order_relaxed)));
            Nan::Set(item, Nan::New("high").ToLocalChecked(), Nan::New<v8::Number>(data->names[i].high.load(std::memory_order_relaxed)));
            Nan::Set(item, Nan::New("hightime").ToLocalChecked(), Nan::New<v8::String>(format_time_point(data->names[i].hightime.load(std::memory_order_relaxed))).ToLocalChecked());
            Nan::Set(item, Nan::New("total").ToLocalChecked(), Nan::New<v8::Number>(data->names[i].total.load(std::memory_order_relaxed)));
            Nan::Set(jsonArray, i-1, item);
        }

        // Set the array as a property of the main object
        Nan::Set(resultObj, Nan::New("counters").ToLocalChecked(), jsonArray);

    // Return the constructed object to JavaScript
    info.GetReturnValue().Set(resultObj);
  } catch (std::exception &e) {
    throw e;
  }
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
        // put all parameters into the props object
        for(const auto& element : params){
            props->putValue(element.first.c_str(),element.second.c_str());
        }

        std::string connection_string = getConnectionString(params);
        connection->openDatabase(connection_string.c_str(), props.get());
        return connection;
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

}
