#ifndef NJS_DATABASE_H
#define NJS_DATABASE_H

#include <napi.h>
#include <string>
#include <unordered_map>

// nuodb spews crap loads of warnings about this; disable it
#ifdef __APPLE__
#pragma clang diagnostic ignored "-Woverloaded-virtual"
#endif
#include "NuoDB.h"

struct njsContext {
  /**
   * Supported options:
   * - host
   * - port
   * - password
   * - user
   * - schema
   */
  std::unordered_map<std::string, std::string> options;
};

class njsDatabase : public Napi::ObjectWrap<njsDatabase> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  njsDatabase(const Napi::CallbackInfo& info);

private:
  static Napi::FunctionReference constructor;

  // Connect to a database asynchronously.
  Napi::Value Connect(const Napi::CallbackInfo& info);
  // Connect to a database synchronously.
  Napi::Value ConnectSync(const Napi::CallbackInfo& info);
  // Direct.
  void ConnectDirect(njsContext *context);

  /**
   * Description:
   * This call commits the current transaction in progress on the connection.
   * 
   * Callback Prototype:
   *    commit(function(Error error){});
   * Promise Prototype:
   *    promise = commit();
   */

  // Commit a database transaction asynchronously.
  Napi::Value Commit(const Napi::CallbackInfo& info);
  // Commit a database transaction synchronously.
  Napi::Value CommitSync(const Napi::CallbackInfo& info);
  // Direct.
  void CommitDirect(njsContext *context);

  // Release a database connection asynchronously.
  Napi::Value Release(const Napi::CallbackInfo& info);
  // Release a database connection synchronously.
  Napi::Value ReleaseSync(const Napi::CallbackInfo& info);
  // Direct.
  void ReleaseDirect();

  void getContext(Napi::Env env, Napi::Object object, njsContext &context);
  // Gets a string option from an object.
  Napi::Value getNamedPropertyString(Napi::Env env, Napi::Object object, std::string key);

  friend class njsConnectAsyncWorker;
  friend class njsReleaseAsyncWorker;

  NuoDB::Connection* connection;
};

#endif
