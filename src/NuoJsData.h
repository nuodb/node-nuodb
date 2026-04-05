// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.


#ifndef NUOJS_DATA_H
#define NUOJS_DATA_H

#include <chrono>
#include <atomic>
#include <string>
#include <array>
#include <vector>
#include <iostream>
#include <cstddef>
#include <sys/mman.h> // POSIX shared memory
#include <fcntl.h>    // For O_CREAT, O_RDWR
#include <unistd.h>   // For ftruncate, close, unlink
#include <functional>
#include <stdexcept>


// The NUOJS_DATA_NAMES_LIST macro defines all the counters maintained for each supporting
// C++ routines that support a Node.js javascript API for database interaction.
// Repeat the format of X(NAME) for any new Counter added, the order of counters does not matter
// for the counters to function, but the order will dictate the natural order in utilites that 
// make the counter values visible.
// The first counter, NUOJS_DATA_NAMES_START, and the last counter, NUOJS_DATA_NAMES_END, must
// stay at the bookends of this list.  This is what allows the list to be iterated for all
// dynamic processing of the values.  This strategy allows the list to expand in the future
// by simply putting a new entry in the list and not have to maintain any other coordinating
// piece of meta information, like a value for the size of the list.
//
// Some counters like WAIT, QUE and DO are Summary type counters
// Other counters represent API behaviors, and each underlying instance created represents
// a particular API call made by the application.  Typically each counter has  3 values,
// CNT for how many API calls are currently simultaneously been called,
// QUE for how many API calls are ready to execute and/or are executing
// DO for how many API calls are currently running on an Node.js Asynchronous thread
//
#define NUOJS_DATA_NAMES_LIST(X)\
  X(NUOJS_DATA_NAMES_START)	\
  X(WAIT)			\
  X(QUE)			\
  X(DO)				\
  X(EXECUTE_CNT)		\
  X(EXECUTE_QUE)		\
  X(EXECUTE_DO)			\
  X(GETROWS_CNT)		\
  X(GETROWS_QUE)		\
  X(GETROWS_DO)			\
  X(RESULTSETCLOSE_CNT)		\
  X(RESULTSETCLOSE_QUE)		\
  X(RESULTSETCLOSE_DO)		\
  X(ROLLBACK_CNT)		\
  X(ROLLBACK_QUE)		\
  X(ROLLBACK_DO)		\
  X(COMMIT_CNT)			\
  X(COMMIT_QUE)			\
  X(COMMIT_DO)			\
  X(CONNECTIONCLOSE_CNT)	\
  X(CONNECTIONCLOSE_QUE)	\
  X(CONNECTIONCLOSE_DO)		\
  X(CONNECT_CNT)		\
  X(CONNECT_QUE)		\
  X(CONNECT_DO)			\
  X(NUOJS_DATA_NAMES_END)

// Macro to increment the amount of active calls to an API
// It will also update the total property of the Counter, indicating how many times an API was used
#define COUNT_ADD(arr, index) \
    (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current++; \
    (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].total++; \
    if ((arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current.load(std::memory_order_relaxed) > (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].high.load(std::memory_order_relaxed)) { \
      (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].high.store((arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current.load(std::memory_order_relaxed)); \
      (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].hightime.store(std::chrono::system_clock::now(), std::memory_order_relaxed); \
    } 
//    std::cout <<  #index << " " << (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current.load(std::memory_order_relaxed) << std::endl;

// Macro to decrement a counter for an API when it finishes a call execution
#define COUNT_SUB(arr, index) \
    (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current--; \
//    std::cout <<  #index << " " << (arr)->names[static_cast<unsigned int>(NuoJsDataNames::index)].current.load(std::memory_order_relaxed) << std::endl;

// Macro used to update WAIT, which indicates how many API calls are waiting for an Asynchronous Thread to process
// The Macro will also set the highwater mark for the counter and the time the setting is made
#define WAIT_REFRESH(arr) \
   if ((arr)->names[static_cast<unsigned int>(NuoJsDataNames::QUE)].current.load(std::memory_order_relaxed) >= (arr)->names[static_cast<unsigned int>(NuoJsDataNames::DO)].current.load(std::memory_order_relaxed)) {\
     (arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].current.store(((arr)->names[static_cast<unsigned int>(NuoJsDataNames::QUE)].current.load(std::memory_order_relaxed) - (arr)->names[static_cast<unsigned int>(NuoJsDataNames::DO)].current.load(std::memory_order_relaxed)), std::memory_order_relaxed); \
   } \
   if ((arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].current.load(std::memory_order_relaxed) > (arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].high.load(std::memory_order_relaxed)) { \
      (arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].high.store((arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].current.load(std::memory_order_relaxed)); \
      (arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].hightime.store(std::chrono::system_clock::now(), std::memory_order_relaxed); \
   }
//   std::cout << "WAIT" << " " << (arr)->names[static_cast<unsigned int>(NuoJsDataNames::WAIT)].current.load(std::memory_order_relaxed) << std::endl;


//  Macro to generate the string representation (using stringizing operator #)
const std::vector<std::string> NuoJsDataNamesStrings = {
#define X(name) #name,
    NUOJS_DATA_NAMES_LIST(X)
#undef X
};

//  Macro to generate the enum itself
enum class NuoJsDataNames {
#define X(name) name,
    NUOJS_DATA_NAMES_LIST(X)
#undef X
};

// Convienence functions to translate functions to translate Enum values for an API Call into strings for 
// streaming or an actual string instance
std::ostream& operator<<(std::ostream& os, NuoJsDataNames name);
std::string to_string(NuoJsDataNames name);


// Using shared memory can be problematic with dynamic memory.  
// You can't really use pointers across multiple process memory spaces
// We need to define a structure for a counter, and for coding simplicity
// now and in the future, allow a dynamically sized array of counters.
// Since multiple threads could attempt to update a particular counter at
// the same time, each property of the counter is protected by the atomic
// template to serialized all read/writes of the values
// We accept each counter represents a point in time value with no specific
// coordination between counter values that need to be enforced.
struct NuoJsDataCounter {
    std::atomic<unsigned long> current;
    std::atomic<unsigned long> high;
    std::atomic<std::chrono::system_clock::time_point> hightime;
    std::atomic<unsigned long> total;
};

// Use a struct to coordinate the memory organization of the counters
// no hidden data members or layout variations that might be associated
// with a clas.  The last member of the struct needs to be declared as an
// array, and we will specifically dynamically allocate enough shared memory
// space to allow the array addressing to operate off the address of the 
// the last array data member.
struct NuoJsData {
    std::atomic<pid_t> pid;
    std::atomic<unsigned int> namelen;
    std::atomic<unsigned long> count;
    NuoJsDataCounter names[1];
    // Do not add any data members after the names array
};

// RAII class to ensure cleanup
// This class is important and used to create a counter subtract function
// An instance of this class is instantiated on the stack any place we have to 
// decrement a counter.  The point of the class is to make the counter is decremented
// no matter how the surrounding function is exited, including a thrown exception.
class Finally {
public:
    explicit Finally(std::function<void()> cleanup) : cleanupFunc(cleanup) {}

    // Destructor runs automatically on scope exit
    ~Finally() {
        if (cleanupFunc) {
            cleanupFunc();
        }
    }

    // Prevent copying to avoid double execution
    Finally(const Finally&) = delete;
    Finally& operator=(const Finally&) = delete;

private:
    std::function<void()> cleanupFunc;
};

// Macro to increment a count and refresh the totals
#define ADD_COUNT(name,type,d) \
	COUNT_ADD(d, name); \
        COUNT_ADD(d, type); \
        WAIT_REFRESH(d);

// Macro to create RAII instance for substraction it will executed
// as part of the RAII destructor and refesh totals
#define SUBTRACT_COUNT(name,type,d) \
        Finally guard([&]() { \
          COUNT_SUB(d, name); \
          COUNT_SUB(d, type); \
          WAIT_REFRESH(d); \
        });

// A single static instance of NuoJsDataManager is used to hold all Async usage information
// and there will be only one instance allocation of this per process.
// All code that needs to reference this instance should do it with a C++ reference.
// Most important part of the class is a private pointer called dataPtr used to point to dynamically
// allocated shared memory that  holds all the counters
// The constructor for the class is made private so we can control the manner an instance
// is created, initialize and ultimately referenced. The user can use the static method getInstance
// to get a C++ reference to the singular static object. 
//
// The setting of Default_shm_name sets a minimal base name to consistently find shared memory
// on a host that has processes that run the Node driver.  If there is more than one process that 
// uses the Node driver, and needs Asynchronous thread monitoring, it should set the environment
// variable NUODB_NODE_NAME.  This name will be tacked on to this base name to create a unique
// shared memory segment to get a set of unique counters.  
//
// It was envisioned shared memory was useful to have a no impact way of reading the counters
// while a process was running, but that of course means you need to run a process to observe
// the values.  For production cases, it is not always possible to run an observing application
// so the values can be observed through API as well.  The manner on how to configure the
// uniqueness and repeatability of a named shared memory segement may change in a future release
class NuoJsDataManager {
public:
    static NuoJsDataManager& getInstance(bool create);
    static NuoJsDataManager instance;    // this is the singular process instance
    NuoJsData* getData() const;
    static const char* get_shm_name();

private:
    inline static constexpr std::string_view Default_shm_name = "nuodb:node";
    static std::string shm_name;
    NuoJsDataManager();
    ~NuoJsDataManager();
    void initialize(bool create);
    NuoJsData* dataPtr;
    bool isInitialized;
    int shm_fd;
};

//#include <functional>
//#include <iostream>

//template <typename F>
//class ScopeGuard {
//public:
//    explicit ScopeGuard(F f) : func(std::move(f)) {}
    
    // Call the function in the destructor
//    ~ScopeGuard() { 
//        try {
//            func(); 
//        } catch (...) {
            // Destructors should never let exceptions escape
//        }
//    }

    // Disable copying
//    ScopeGuard(const ScopeGuard&) = delete;
//    ScopeGuard& operator=(const ScopeGuard&) = delete;

//private:
//    F func;
//};

#endif
