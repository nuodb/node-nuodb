#include <napi.h>
#include "njsConnection.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("connection", njsConnection::Init(env, exports));
  // return njsConnection::Init(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
