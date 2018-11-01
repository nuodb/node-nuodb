#include <napi.h>
#include "NuoJsConnection.h"

Napi::Value connect(const Napi::CallbackInfo& info)
{
    return NuoJs::Connection::newInstance(info);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "connect"), Napi::Function::New(env, connect));
    return NuoJs::Connection::init(env, exports);
}

NODE_API_MODULE(nuodb, InitAll)
