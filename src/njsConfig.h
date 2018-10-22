#ifndef NJS_CONFIG_H
#define NJS_CONFIG_H

#include <string>
#include <unordered_map>

/**
 * Represents a NuoDB database configuration.
 * 
 * Supported options include:
 * - host
 * - port
 * - user
 * - password
 * - schema
 */
struct njsConfig
{
  std::unordered_map<std::string, std::string> options;
};

#endif
