#ifndef NUOJS_ADDON_H
#define NUOJS_ADDON_H

#include <stddef.h>
#include <napi.h>

// #define NUODB_DEBUG

#ifdef NUODB_DEBUG
# define LOG(msg) fprintf(stderr, "%s\n", msg);
# define TRACEF(format, arg) fprintf(stderr, format, arg);
#else
# define LOG(msg) ;
# define TRACEF(format, arg) ;
#endif

#define TRACE(msg) LOG(msg);

#endif
