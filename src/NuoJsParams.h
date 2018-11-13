#ifndef NUOJS_PARAMS_H
#define NUOJS_PARAMS_H

#include <string>
#include <unordered_map>
#include "NuoJsAddon.h"

namespace NuoJs
{
// Params represents the database connection credentials and properties.
typedef std::unordered_map<std::string, std::string> Params;

// getJsonParams returns the JSON parameters provided by the user.
void getJsonParams(Napi::Env env, Napi::Object object, Params& params);

// getConnectionString forms a connection string from the provided parameters.
std::string getConnectionString(Params& params);
}

#endif
