#ifndef NJS_ADDON_H
#define NJS_ADDON_H

#define NDEBUG

#ifdef NDEBUG
#define LOG(msg) fprintf(stderr, "%s\n", msg);
#define TRACEF(format, arg) fprintf(stderr, format, arg);
#else
#define LOG(msg) ;
#define TRACEF(format, arg) ;
#endif

#define TRACE(msg) LOG(msg);

#endif