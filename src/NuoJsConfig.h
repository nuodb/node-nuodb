#ifndef NUOJS_CONFIG_H
#define NUOJS_CONFIG_H

#include <string>
#include <unordered_map>

namespace NuoJs
{
/**
 * Represents a NuoDB database configuration.
 *
 * Supported options include:
 * - database
 * - hostname
 * - port
 * - user
 * - password
 * - schema
 */
struct Config
{
    std::unordered_map<std::string, std::string> options;
};
}

#endif
