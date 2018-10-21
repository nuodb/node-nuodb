#include <napi.h>
#include "njsDatabase.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("database", njsDatabase::Init(env, exports));
  // return njsDatabase::Init(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
