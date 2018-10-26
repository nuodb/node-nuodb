#include <stdio.h>
#include <sstream>
#include <iostream>
#include <exception>

#include <napi.h>
#include <uv.h>

#include "njsConnection.h"

using namespace Napi;

Napi::FunctionReference njsConnection::constructor;

Napi::Object njsConnection::Init(Napi::Env env, Napi::Object exports)
{
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "Connection",
                                      { InstanceMethod("close", &njsConnection::Close),
                                        InstanceMethod("commit", &njsConnection::Commit) });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("Connection", func);

    return exports;
}

/* static */ Napi::Value njsConnection::NewInstance(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        // N-API makes it exceedingly hard to implement RAII. The only way to implement RAII
        // is to wrap the Napi::CallbackInfo instance with a new Napi::Object, and pass that
        // as the only argument (so that later on in the constructor we can unwrap and get at
        // the original argument list); this is to effectively permit varargs C++ constructors.
        //
        // That seemed like a real headache, so we opted for the latter, to have the constructor
        // called, have it do nothing, and then delegate all the real work to the Connect method
        // of the unwrapped object.
        Napi::EscapableHandleScope scope(env);
        // Construct and permit the object to survive the lifespan of this scope...
        Napi::Object that = constructor.New({ info[0] });
        scope.Escape(napi_value(that)).ToObject();

        // Connect to the database...
        njsConnection* c = ObjectWrap::Unwrap(that);
        return c->Connect(info);
    } catch (std::exception& e) {
        std::string message = std::string("Failed to create new connection: ") + e.what();
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

void njsConnection::hello(std::string msg)
{
    printf(msg.c_str());
}

njsConnection::njsConnection(const Napi::CallbackInfo& info) : Napi::ObjectWrap<njsConnection>(info)
{
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);
    try {
        open = false;
        connection = NuoDB::Connection::create();
    } catch (NuoDB::SQLException& exception) {
        // todo: exception.getText()
        Napi::Error::New(env, "Failed to open database").ThrowAsJavaScriptException();
    }
}

Napi::Value njsConnection::getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key)
{
    if (!object.Has(key)) {
        Napi::TypeError::New(env, "Missing " + key).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Value value = object[key];
    if (!value.IsString()) {
        Napi::TypeError::New(env, "Invalid type for " + key).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return value.ToString();
}

void njsConnection::setOption(Napi::Env env, Napi::Object object, njsConfig& config, std::string key, bool required)
{
    if (required && !object.Has(key)) {
        std::string err_message = std::string("config missing key: ") + key;
        throw std::runtime_error(err_message);
    }
    config.options[key] = this->getNamedPropertyString(env, object, key).ToString();
}

void njsConnection::setOptionOrDefault(Napi::Env env, Napi::Object object, njsConfig& config, std::string key, std::string value)
{
    if (object.Has(key)) {
        value = this->getNamedPropertyString(env, object, key).ToString();
    }
    config.options[key] = value;
}

void njsConnection::getConfig(Napi::Env env, Napi::Object object, njsConfig& config)
{
    // get the database name (required)
    this->setOption(env, object, config, "database", true);
    // get the user name (required)
    this->setOption(env, object, config, "user", true);
    // get the password (required)
    this->setOption(env, object, config, "password", true);

    // get the host name (optional, default to localhost)
    this->setOptionOrDefault(env, object, config, "hostname", "localhost");
    // get the port (optional, default to 48004)
    this->setOptionOrDefault(env, object, config, "port", "48004");
    // get the schema (optional, default is USER)
    this->setOptionOrDefault(env, object, config, "schema", "USER");
}

class njsConnectAsyncWorker : public Napi::AsyncWorker
{
public:
    // this transfers responsibility to cleanup config object to worker
    njsConnectAsyncWorker(const Napi::Function& callback, njsConnection& target, njsConfig* config)
        : Napi::AsyncWorker(callback), target(target), config(config)
    {}

    ~njsConnectAsyncWorker()
    {
        delete config;
    }

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doConnect(*config);
        } catch (std::exception& e) {
            std::string message = std::string("Failed to open database: ") + e.what();
            this->SetError(message);
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined(), target.Value() });
    }

private:
    njsConnection& target;
    njsConfig* config;
};

// Connect to the database asynchronously.
Napi::Value njsConnection::Connect(const Napi::CallbackInfo& info)
{
    TRACE("Connect");

    Napi::Env env = info.Env();

    // If we're called async, we have a config object and a callback. If we're
    // dealing with promises, we only have a config object...
    if (info.Length() < 1 || info.Length() > 2) {
        Napi::TypeError::New(env, "Invalid argument count").ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "Invalid argument types: not object").ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    Napi::Object options = info[0].As<Napi::Object>();

    // Retrievig the config must be done within the JS engine event loop.
    njsConfig* config = new njsConfig;
    try {
        getConfig(info.Env(), options, *config);
    } catch (std::exception& e) {
        std::string err = std::string("Bad configuration: ") + e.what();
        Napi::TypeError::New(env, err).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 2) {
        if (!info[1].IsFunction()) {
            Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[1].As<Napi::Function>();

        njsConnectAsyncWorker* asyncWorker = new njsConnectAsyncWorker(callback, *this, config);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 1 only if this is called as a Promise.
    else if (info.Length() == 1) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            this->doConnect(*config);
            deferred.Resolve(this->Value());
        } catch (std::exception& e) {
            std::string message = std::string("Failed to open database: ") + e.what();
            deferred.Reject(Napi::TypeError::New(env, message).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void njsConnection::doConnect(njsConfig& config)
{
    TRACE("doConnect");

    if (open) {
        throw std::runtime_error("connection already open");
    }

    std::ostringstream connection_string;
    connection_string << config.options["database"] << "@" << config.options["hostname"] << ":" << config.options["port"];

    // free properties!
    NuoDB::Properties* props = connection->allocProperties();
    props->putValue("user", config.options["user"].c_str());
    props->putValue("password", config.options["password"].c_str());

    try {
        connection->openDatabase(connection_string.str().c_str(), props);
        open = true;
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

class njsCommitAsyncWorker : public Napi::AsyncWorker
{
public:
    njsCommitAsyncWorker(const Napi::Function& callback, njsConnection& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~njsCommitAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doCommit();
        } catch (std::exception& e) {
            this->SetError(e.what());
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined() });
    }

private:
    njsConnection& target;
};

// Connect to the database asynchronously.
Napi::Value njsConnection::Commit(const Napi::CallbackInfo& info)
{
    TRACE("Commit");

    Napi::Env env = info.Env();

    // If we're called async, we have a callback. If we're
    // dealing with promises, we have no arguments...
    if (info.Length() > 1) {
        Napi::TypeError::New(env, "Invalid argument count").ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 1) {
        if (!info[0].IsFunction()) {
            Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[0].As<Napi::Function>();

        njsCommitAsyncWorker* asyncWorker = new njsCommitAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 0 only if this is called as a Promise.
    else if (info.Length() == 0) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            this->doCommit();
            deferred.Resolve(this->Value());
        } catch (std::exception& e) {
            deferred.Reject(Napi::TypeError::New(env, e.what()).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void njsConnection::doCommit()
{
    TRACE("doCommit");

    if (!open) {
        throw std::runtime_error("connection closed or invalid");
    }

    try {
        connection->commit();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

class njsCloseAsyncWorker : public Napi::AsyncWorker
{
public:
    njsCloseAsyncWorker(const Napi::Function& callback, njsConnection& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~njsCloseAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doClose();
        } catch (std::exception& e) {
            std::string message = std::string("Failed to close connection: ") + e.what();
            this->SetError(message);
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined() });
    }

private:
    njsConnection& target;
};

Napi::Value njsConnection::Close(const Napi::CallbackInfo& info)
{
    TRACE("Close");

    Napi::Env env = info.Env();

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 1) {
        if (!info[0].IsFunction()) {
            Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[0].As<Napi::Function>();

        njsCloseAsyncWorker* asyncWorker = new njsCloseAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 0 only if this is called as a Promise.
    else if (info.Length() == 0) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            this->doClose();
            deferred.Resolve(this->Value());
        } catch (std::exception& e) {
            std::string message = std::string("Failed to close connection: ") + e.what();
            deferred.Reject(Napi::TypeError::New(env, message).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void njsConnection::doClose()
{
    TRACE("doClose");

    if (!open) {
        throw std::runtime_error("connection already closed");
    }

    try {
        open = false;
        connection->close();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}
