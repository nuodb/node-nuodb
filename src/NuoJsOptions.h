#ifndef NUOJS_OPTIONS_H
#define NUOJS_OPTIONS_H

#include "NuoJsAddon.h"

namespace NuoJs
{
// getJsonOptions returns the JSON parameters provided by the user.
void getJsonOptions(Napi::Env env, Napi::Object options, class Context & context);
}

#endif
