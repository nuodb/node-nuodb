// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_ADDON_H
#define NUOJS_ADDON_H

#include <stddef.h>
#include <stdint.h>

#include <thread>
#include <chrono>

#include <v8.h>
#include <node.h>
#include <nan.h>

#include "NuoDB.h"

using namespace v8;

//#define ENABLE_TRACE 0
#define DELAY_TIME 0

#define LOG(msg) fprintf(stderr, "%s\n", msg);
#define DELAY(time) std::this_thread::sleep_for(std::chrono::milliseconds(time));

#ifdef ENABLE_TRACE
  #ifdef DELAY_TIME > 0
    #define TRACE(msg) DELAY(DELAY_TIME) LOG(msg)
  #else
    #define TRACE(msg) LOG(msg);
  #endif
#else
  #define TRACE(msg)
#endif
