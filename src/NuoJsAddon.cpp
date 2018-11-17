#include "NuoJsAddon.h"
#include "NuoJsConnection.h"
#include "NuoJsResultSet.h"

Napi::Value connect(const Napi::CallbackInfo& info)
{
    return NuoJs::Connection::newInstance(info);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "connect"), Napi::Function::New(env, connect));
    exports = NuoJs::Connection::init(env, exports);
    exports = NuoJs::ResultSet::init(env, exports);
    return exports;
}

NODE_API_MODULE(nuodb, InitAll)
