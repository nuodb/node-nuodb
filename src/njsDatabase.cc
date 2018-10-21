#include <napi.h>
#include <uv.h>
#include <stdio.h>

#include "njsDatabase.h"

using namespace Napi;

class njsConnectAsyncWorker : public Napi::AsyncWorker
{
public:
  njsConnectAsyncWorker(const Napi::Function &callback, njsDatabase &target, njsContext *context)
      : Napi::AsyncWorker(callback), target(target), context(context)
  {
  }

  ~njsConnectAsyncWorker()
  {
    delete context;
  }

  void Execute()
  {
    // try-catch
    target.ConnectDirect(context);
    // this->SetError("An error occured!");
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined(), target.Value()});
  }

private:
  njsDatabase &target;
  njsContext *context;
};

class njsReleaseAsyncWorker : public Napi::AsyncWorker
{
public:
  njsReleaseAsyncWorker(const Napi::Function &callback, njsDatabase &target)
      : Napi::AsyncWorker(callback), target(target)
  {
  }

  ~njsReleaseAsyncWorker()
  {
  }

  void Execute()
  {
    // try-catch
    target.ReleaseDirect();
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined()});
  }

private:
  njsDatabase &target;
};

class njsCommitAsyncWorker : public Napi::AsyncWorker
{
public:
  njsCommitAsyncWorker(const Napi::Function &callback, njsDatabase &target)
      : Napi::AsyncWorker(callback), target(target)
  {
  }

  ~njsCommitAsyncWorker()
  {
  }

  void Execute()
  {
    // try-catch
    // target.CommitDirect();
  }

  void OnOK()
  {
    Napi::HandleScope scope(Env());
    Callback().Call({Env().Undefined()});
  }

private:
  njsDatabase &target;
};

Napi::FunctionReference njsDatabase::constructor;

Napi::Object njsDatabase::Init(Napi::Env env, Napi::Object exports)
{
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Database", {InstanceMethod("connect", &njsDatabase::Connect), InstanceMethod("release", &njsDatabase::Release)});

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Database", func);
  return exports;
}

njsDatabase::njsDatabase(const Napi::CallbackInfo &info) : Napi::ObjectWrap<njsDatabase>(info)
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

#include <stdio.h>

Napi::Value njsDatabase::getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key)
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

void njsDatabase::getContext(Napi::Env env, Napi::Object object, njsContext &context)
{
  context.options["user"] = this->getNamedPropertyString(env, object, "user").ToString();
  context.options["password"] = this->getNamedPropertyString(env, object, "user").ToString();
}

// Connect to the database asynchronously.
Napi::Value njsDatabase::Connect(const Napi::CallbackInfo &info)
{
  printf("Connect\n");

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

  njsContext *context = new njsContext;
  getContext(info.Env(), options, *context);

  // promise
  if (info.Length() == 1)
  {
    auto deferred = Napi::Promise::Deferred::New(env);
    this->ConnectDirect(context);
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

    njsConnectAsyncWorker *asyncWorker = new njsConnectAsyncWorker(callback, *this, context);
    asyncWorker->Queue();
    return info.Env().Undefined();
  }
}

// Connect to the database asynchronously.
Napi::Value njsDatabase::ConnectSync(const Napi::CallbackInfo &info)
{
  printf("ConnectSync\n");
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1)
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

  njsContext *context = new njsContext;
  getContext(info.Env(), options, *context);

  // todo wrap with try-catch...
  this->ConnectDirect(context);

  return env.Undefined();
}

void njsDatabase::ConnectDirect(njsContext *context)
{
  printf("ConnectDirect\n");

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

Napi::Value njsDatabase::Release(const Napi::CallbackInfo &info)
{
  printf("Release\n");

  Napi::Env env = info.Env();

  if (info.Length() < 1)
  {
    Napi::TypeError::New(env, "Invalid argument count").ThrowAsJavaScriptException();
    return info.Env().Undefined();
  }

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

Napi::Value njsDatabase::ReleaseSync(const Napi::CallbackInfo &info)
{
  printf("ReleaseSync\n");
  Napi::Env env = info.Env();

  this->ReleaseDirect();

  return env.Undefined();
}

void njsDatabase::ReleaseDirect()
{
  printf("ReleaseDirect\n");
  // try {
  //   // todo: change from hard-coded database name to connection string
  //   connection->close();
  // } catch (NuoDB::SQLException & exception) {
  //   // todo: exception.getText()
  //   Napi::Error::New(env, "Failed to close connection").ThrowAsJavaScriptException();
  // }
}
