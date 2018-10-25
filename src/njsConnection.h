#ifndef NJS_CONNECTION_H
#define NJS_CONNECTION_H

#include <napi.h>
#include "addon.h"
#include "njsConfig.h"

// nuodb emits lots of warnings about this; so disable it
#ifdef __APPLE__
#pragma clang diagnostic ignored "-Woverloaded-virtual"
#endif
#include "NuoDB.h"

class njsConnection : public Napi::ObjectWrap<njsConnection>
{
public:
  // Initialize the class system with connection type info.
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  // Constructor
  njsConnection(const Napi::CallbackInfo &info);

private:
  static Napi::FunctionReference constructor;

  // Connect to a database asynchronously.
  Napi::Value Connect(const Napi::CallbackInfo &info);

  // Commit a database transaction asynchronously.
  Napi::Value Commit(const Napi::CallbackInfo &info);

  // Release a database connection asynchronously.
  Napi::Value Release(const Napi::CallbackInfo &info);

  // Gets a config from the given NAPI object.
  void getConfig(Napi::Env env, Napi::Object object, njsConfig &config);
  // Gets a string option from an object.
  Napi::Value getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key);
  // Sets an option from the named property in the object into the configuration.
  void setOption(Napi::Env env, Napi::Object object, njsConfig &config, std::string key, bool required);
  // Sets an option from the named property in the object into the configuration; if the value does not exist use the provided default value.
  void setOptionOrDefault(Napi::Env env, Napi::Object object, njsConfig &config, std::string key, std::string value);

  // Get connection string.
  std::string getConnectionString(const njsConfig &config);

  // Internal connect method that works against a NuoDB connection object.
  void doConnect(njsConfig &config);

  // Internal commit method that works against a NuoDB connection object.
  void doCommit();

  // Internal release method that works against a NuoDB connection object.
  void doRelease();

  // Async worker for creating connections.
  friend class njsConnectAsyncWorker;
  // Async worker for committing transactions.
  friend class njsCommitAsyncWorker;
  // Async worker for releasing connections.
  friend class njsReleaseAsyncWorker;

  NuoDB::Connection *connection;
};

#endif
