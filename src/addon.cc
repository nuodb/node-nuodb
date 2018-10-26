#include <napi.h>
#include "njsConnection.h"

Napi::Value Connect(const Napi::CallbackInfo &info)
{
  return njsConnection::NewInstance(info);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
  exports.Set(Napi::String::New(env, "connect"), Napi::Function::New(env, Connect));
  return njsConnection::Init(env, exports);
}

NODE_API_MODULE(addon, InitAll)
