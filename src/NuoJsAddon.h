// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_ADDON_H
#define NUOJS_ADDON_H

#include <stddef.h>
#include <stdint.h>

#include <v8.h>
#include <node.h>
#include <nan.h>

#include "NuoDB.h"

using namespace v8;

// #define ENABLE_TRACE 0

#define LOG(msg) fprintf(stderr, "%s\n", msg);

#ifdef ENABLE_TRACE
# define TRACE(msg) LOG(msg);
#else
# define TRACE(msg)
#endif

#endif
