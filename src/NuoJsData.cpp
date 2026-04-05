// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsData.h"
#include <sys/types.h>
#include <unistd.h>
#include <iostream>
#include <string>
#include <cstring>
#include <cstdlib> // Required for getenv

std::ostream& operator<<(std::ostream& os, NuoJsDataNames name) {
  os << NuoJsDataNamesStrings.at(static_cast<unsigned int>(name));
  return os;
}

std::string to_string(NuoJsDataNames f) {
  return NuoJsDataNamesStrings.at(static_cast<unsigned int>(f));
}

NuoJsDataManager& NuoJsDataManager::getInstance(bool create) {
    static NuoJsDataManager instance;    // this is the singular process instance
    if (!instance.isInitialized) {
        instance.initialize(create);
    }
    return instance;
}

NuoJsData* NuoJsDataManager::getData() const {
    return dataPtr;
}

NuoJsDataManager::NuoJsDataManager() : dataPtr(nullptr), isInitialized(false), shm_fd(-1) {}

NuoJsDataManager::~NuoJsDataManager() {
   if (dataPtr != nullptr) {
     munmap(dataPtr, sizeof(NuoJsData) + (dataPtr->count.load(std::memory_order_relaxed) - 1) * sizeof(NuoJsDataCounter));
   }
   if (shm_fd != -1) {
     if (isInitialized) {
       // Unlink in one program (e.g., the creator/server) when done
       shm_unlink("/my_shared_memory");
     }
     close(shm_fd);
  }
}
    
std::string NuoJsDataManager::shm_name = "";

const char* NuoJsDataManager::get_shm_name() {
  if (NuoJsDataManager::shm_name.empty()) {
    NuoJsDataManager::shm_name = NuoJsDataManager::Default_shm_name;
    const char* env_var_value = std::getenv("NUODB_NODE_NAME");

    // Check if the environment variable was set (not NULL) and append if it is
    if (env_var_value != nullptr) {
        // Append the value to the existing string
	    NuoJsDataManager::shm_name += ":"; // Add a separator if needed
	    NuoJsDataManager::shm_name += env_var_value;
    } else {
	    char hostname[256];
	    if (gethostname(hostname, sizeof(hostname)) != 0) std::runtime_error("gethostname failed");
	    NuoJsDataManager::shm_name += ":"; // Add a separator if needed
	    NuoJsDataManager::shm_name += hostname;
    }
  }
  return NuoJsDataManager::shm_name.c_str();
}

// Method to initialize the counters
void NuoJsDataManager::initialize(bool create) {

  //Iterate list of names to get the size of array needed for all counters
  unsigned long namesCount = 0;
  for (size_t i = static_cast<unsigned long>(NuoJsDataNames::NUOJS_DATA_NAMES_START); i < static_cast<unsigned long>(NuoJsDataNames::NUOJS_DATA_NAMES_END); ++i) {
     NuoJsDataNames name = static_cast<NuoJsDataNames>(i);
     switch (name) {
	  case NuoJsDataNames::NUOJS_DATA_NAMES_END:
            break;
	  case NuoJsDataNames::NUOJS_DATA_NAMES_START:
	  default:
	    namesCount++;
            break;
     }
  }

  // Compute the size of shared memory needed to hold all the counters and the associated meta information
  size_t shm_size = sizeof(NuoJsData) + (namesCount > 0 ? (namesCount - 1) * sizeof(NuoJsDataCounter) : 0);
  size_t mapSize = shm_size; // Map an arbitrary size, then use internal capacity
  if (create) {
    isInitialized = true;
    // Create shared memory object
    shm_fd = shm_open(NuoJsDataManager::get_shm_name(), O_CREAT | O_RDWR, 0666);
    if (shm_fd == -1) throw std::runtime_error("shm_open failed");
      // Resize the shared memory object
      ftruncate(shm_fd, shm_size);
      // Map shared memory
      dataPtr = static_cast<NuoJsData*>(mmap(NULL, mapSize, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0));
      if (dataPtr == MAP_FAILED) throw std::runtime_error("mmap failed");
      pid_t pid = getpid();
      if (dataPtr->pid.load(std::memory_order_relaxed) == pid) throw std::runtime_error("Possible Unprotected Shared Memory Create");
      memset((void*)dataPtr, 0, shm_size);
      dataPtr->pid.store(pid, std::memory_order_relaxed); 
      dataPtr->count.store(namesCount, std::memory_order_relaxed); 
      // In the future, maybe zero-ing the size of an entire names array slot, instead of each data member of the slot 
      for (size_t i = 0; i < dataPtr->count.load(std::memory_order_relaxed); ++i) {
          dataPtr->names[i].current.store(0, std::memory_order_relaxed); // Initialize all to 0
          dataPtr->names[i].high.store(0, std::memory_order_relaxed); // Initialize all to 0
	  dataPtr->names[i].hightime.store(std::chrono::system_clock::now(), std::memory_order_relaxed);
          dataPtr->names[i].total.store(0, std::memory_order_relaxed); // Initialize all to 0
      }
      dataPtr->namelen.store(0, std::memory_order_relaxed);
      for (std::size_t i = 1; i <= NuoJsDataNamesStrings.size()-2; ++i) {
	  if (NuoJsDataNamesStrings[i].length() > dataPtr->namelen.load(std::memory_order_relaxed)) {
	    dataPtr->namelen.store(NuoJsDataNamesStrings[i].length(), std::memory_order_relaxed);
	  }
      }
  } else {
    // Open existing shared memory object
    shm_fd = shm_open(NuoJsDataManager::get_shm_name(), O_RDWR, 0666);
    if (shm_fd == -1) {
      // Throw runtime exception with errno details
      throw std::system_error( errno, std::generic_category(), "shm_open failed for " + std::string(get_shm_name()));
    }

    // Determine size (this is complex without prior agreement, here we assume it's known)
    // A common approach is a fixed size, or the creator communicates the size via another IPC
    // or the reader maps a minimum size, reads the capacity, and remaps.
    // For simplicity in this example, we assume size is known/fixed or handled externally.

     // Map shared memory (adjust size as needed for actual use case)
     dataPtr = static_cast<NuoJsData*>(mmap(NULL, mapSize, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0));
     if (dataPtr == MAP_FAILED) throw std::runtime_error("mmap failed");
   }
}
