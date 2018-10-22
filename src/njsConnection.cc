#include <napi.h>
#include <uv.h>
#include <stdio.h>

#include "njsConnection.h"

using namespace Napi;

Napi::FunctionReference njsConnection::constructor;

Napi::Object njsConnection::Init(Napi::Env env, Napi::Object exports)
{
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Connection",
                                    {InstanceMethod("connect", &njsConnection::Connect),
                                     InstanceMethod("release", &njsConnection::Release),
                                     InstanceMethod("commit", &njsConnection::Commit)});

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Connection", func);
  return exports;
}

njsConnection::njsConnection(const Napi::CallbackInfo &info) : Napi::ObjectWrap<njsConnection>(info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  /*
  try {
    connection = NuoDB::Connection::create();
  } catch (NuoDB::SQLException & exception) {
    // todo: exception.getText()
    Napi::Error::New(env, "Failed to open database").ThrowAsJavaScriptException();
  }
  */
}

Napi::Value njsConnection::getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key)
{
  if (!object.Has(key))
  {
    Napi::TypeError::New(env, "Missing " + key).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Value value = object[key];
  if (!value.IsString())
  {
    Napi::TypeError::New(env, "Invalid type for " + key).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return value.ToString();
}

void njsConnection::getConfig(Napi::Env env, Napi::Object object, njsConfig &config)
{
  config.options["user"] = this->getNamedPropertyString(env, object, "user").ToString();
  config.options["password"] = this->getNamedPropertyString(env, object, "user").ToString();
}

class njsConnectAsyncWorker : public Napi::AsyncWorker
{
public:
  njsConnectAsyncWorker(const Napi::Function &callback, njsConnection &target, njsConfig *config)
      : Napi::AsyncWorker(callback), target(target), config(config)
  {
  }

  ~njsConnectAsyncWorker()
  {
    delete config;
  }

  void Execute()
  {
    // try-catch
    target.doConnect(config);
    // this->SetError("An error occured!");
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined(), target.Value()});
  }

private:
  njsConnection &target;
  njsConfig *config;
};

// Connect to the database asynchronously.
Napi::Value njsConnection::Connect(const Napi::CallbackInfo &info)
{
  TRACE("Connect");

  Napi::Env env = info.Env();

  if (info.Length() < 1 || info.Length() > 2)
  {
    Napi::TypeError::New(env, "Invalid argument count").ThrowAsJavaScriptException();
    return info.Env().Undefined();
  }

  if (!info[0].IsObject())
  {
    Napi::TypeError::New(env, "Invalid argument types: not object").ThrowAsJavaScriptException();
    return info.Env().Undefined();
  }
  Napi::Object options = info[0].As<Napi::Object>();

  njsConfig *config = new njsConfig;
  getConfig(info.Env(), options, *config);

  // promise
  if (info.Length() == 1)
  {
    auto deferred = Napi::Promise::Deferred::New(env);
    this->doConnect(config);
    deferred.Resolve(this->Value());
    return deferred.Promise();
  }
  // async
  else
  {
    if (!info[1].IsFunction())
    {
      Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
    Napi::Function callback = info[1].As<Napi::Function>();

    njsConnectAsyncWorker *asyncWorker = new njsConnectAsyncWorker(callback, *this, config);
    asyncWorker->Queue();
    return info.Env().Undefined();
  }
}

void njsConnection::doConnect(njsConfig *config)
{
  TRACE("doConnect");

  /*
  // todo automatically free properties
  NuoDB::Properties *properties = connection->allocProperties();
  properties->putValue("user", ((std::string)user).c_str());
  properties->putValue("password", ((std::string)password).c_str());

  try {
    // todo: change from hard-coded database name to connection string
    connection->openDatabase("fake-db-name", properties);
  } catch (NuoDB::SQLException & exception) {
    // todo: exception.getText()
    Napi::Error::New(env, "Failed to open database").ThrowAsJavaScriptException();
    return info.Env().Undefined();
  }
  */
}

class njsCommitAsyncWorker : public Napi::AsyncWorker
{
public:
  njsCommitAsyncWorker(const Napi::Function &callback, njsConnection &target)
      : Napi::AsyncWorker(callback), target(target)
  {
  }

  ~njsCommitAsyncWorker()
  {
  }

  void Execute()
  {
    // try-catch
    target.doCommit();
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined()});
  }

private:
  njsConnection &target;
};

// Connect to the database asynchronously.
Napi::Value njsConnection::Commit(const Napi::CallbackInfo &info)
{
  TRACE("Commit");

  Napi::Env env = info.Env();
  if (info.Length() == 1)
  {
    if (!info[1].IsFunction())
    {
      Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
    Napi::Function callback = info[1].As<Napi::Function>();

    njsCommitAsyncWorker *asyncWorker = new njsCommitAsyncWorker(callback, *this);
    asyncWorker->Queue();
    return info.Env().Undefined();
  }
  else
  {
    auto deferred = Napi::Promise::Deferred::New(env);
    this->doCommit();
    deferred.Resolve(this->Value());
    return deferred.Promise();
  }
}

void njsConnection::doCommit()
{
  TRACE("doConnect");

  /*
  // todo automatically free properties
  NuoDB::Properties *properties = connection->allocProperties();
  properties->putValue("user", ((std::string)user).c_str());
  properties->putValue("password", ((std::string)password).c_str());

  try {
    // todo: change from hard-coded database name to connection string
    connection->openDatabase("fake-db-name", properties);
  } catch (NuoDB::SQLException & exception) {
    // todo: exception.getText()
    Napi::Error::New(env, "Failed to open database").ThrowAsJavaScriptException();
    return info.Env().Undefined();
  }
  */
}

class njsReleaseAsyncWorker : public Napi::AsyncWorker
{
public:
  njsReleaseAsyncWorker(const Napi::Function &callback, njsConnection &target)
      : Napi::AsyncWorker(callback), target(target)
  {
  }

  ~njsReleaseAsyncWorker()
  {
  }

  void Execute()
  {
    // try-catch
    target.doRelease();
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined()});
  }

private:
  njsConnection &target;
};

Napi::Value njsConnection::Release(const Napi::CallbackInfo &info)
{
  TRACE("Release");

  Napi::Env env = info.Env();
  if (info.Length() == 1)
  {
    if (!info[0].IsFunction())
    {
      Napi::TypeError::New(env, "Invalid argument types: not function").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
    Napi::Function callback = info[0].As<Napi::Function>();

    njsReleaseAsyncWorker *asyncWorker = new njsReleaseAsyncWorker(callback, *this);
    asyncWorker->Queue();
    return info.Env().Undefined();
  }
  else
  {
    auto deferred = Napi::Promise::Deferred::New(env);
    this->doRelease();
    deferred.Resolve(this->Value());
    return deferred.Promise();
  }
}

void njsConnection::doRelease()
{
  TRACE("doRelease");
  // try {
  //   // todo: change from hard-coded database name to connection string
  //   connection->close();
  // } catch (NuoDB::SQLException & exception) {
  //   // todo: exception.getText()
  //   Napi::Error::New(env, "Failed to close connection").ThrowAsJavaScriptException();
  // }
}
