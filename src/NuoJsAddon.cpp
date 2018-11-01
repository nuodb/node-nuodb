#include <napi.h>
#include "NuoJsConnection.h"

Napi::Value Connect(const Napi::CallbackInfo& info)
{
    return NuoJs::Connection::NewInstance(info);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "connect"), Napi::Function::New(env, Connect));
    return NuoJs::Connection::Init(env, exports);
}

NODE_API_MODULE(nuodb, InitAll)
