#include <string>
#include <ctime>
#include <chrono>
#include <thread>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include "NuoJsData.h"

using namespace std;

std::string format_time_point(std::chrono::system_clock::time_point tp) {
    std::time_t t = std::chrono::system_clock::to_time_t(tp);
    // Use localtime() for local time zone, or gmtime() for UTC
    // Note: localtime() and gmtime() are not thread-safe; use localtime_s/localtime_r
    // or gmtime_s/gmtime_r for thread-safe alternatives where available.
    std::tm tm_struct = *std::localtime(&t);

    std::ostringstream oss;
    // Format the time as "YYYY-MM-DD HH:MM:SS"
    oss << std::put_time(&tm_struct, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

int main() {
  try {
    NuoJsDataManager& manager = NuoJsDataManager::getInstance(false);
    NuoJsData* data = manager.getData();
//    std::cout << "{";
//    std::cout << "\"snaps\":[";
    std::cout << "{";
    std::cout << "\"timestamp\":\"" << format_time_point(chrono::system_clock::now()) << "\",";
    std::cout << "\"counters\":[";
    for (unsigned long i = 1; i < data->count.load(std::memory_order_relaxed); ++i) {
      std::cout << "{";
      std::cout << "\"name\":" << "\"" << NuoJsDataNamesStrings.at(i) << "\",";
      std::cout << "\"current\":" << data->names[i].current.load(std::memory_order_relaxed) << ",";
      std::cout << "\"high\":" << data->names[i].high.load(std::memory_order_relaxed) << ",";
      std::cout << "\"hightime\":\"" << format_time_point(data->names[i].hightime.load(std::memory_order_relaxed)) << "\",";
      std::cout << "\"total\":" << data->names[i].total.load(std::memory_order_relaxed);
      std::cout << "}";
      if (i < data->count-1) {
        std::cout << ",";
      }
      std::cout << std::endl;
    }
    std::cout << "]}";
//    std::cout << "]}";
    std::cout << std::endl;
    return 0;
  } catch (const std::exception& e) {
    std::cerr << "Caught exception: " << e.what() << std::endl;
    return -1;
  }
}
