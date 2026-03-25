#include <ncurses.h>
#include <vector>
#include <string>
#include <ctime>
#include <chrono>
#include <thread>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include "NuoJsData.h"

using namespace std;

NuoJsDataManager& manager = NuoJsDataManager::getInstance(false);
NuoJsData* infodata = manager.getData();

// Function to get current time string
string getFormattedTime() {
    auto now = chrono::system_clock::now();
    time_t time = chrono::system_clock::to_time_t(now);
    char buf[10];
    strftime(buf, sizeof(buf), "%H:%M:%S", localtime(&time));
    return string(buf);
}

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
    // Initialize ncurses
    // Workaround drawing problem, call setlocale(LC_ALL, ""); before initscr() to enable Unicode, which allows ncurses to use proper line-drawing characters
    setlocale(LC_ALL, "");
    initscr();
    noecho();
    cbreak();
    curs_set(0); // Hide cursor
    timeout(1000); // Set wgetch timeout to 1s

    // Define windows
    int maxY, maxX;
    getmaxyx(stdscr, maxY, maxX);
    
    // Top Window (Graph): Height, Width, StartY, StartX
    WINDOW* graphWin = newwin(infodata->count.load(std::memory_order_relaxed)+4, maxX - 1, 1, 1);
    box(graphWin, 0, 0);
    mvwprintw(graphWin, 0, 2, " NuoDB Node.js Async Info ");

    // Bottom Window (Peaks): Height, Width, StartY, StartX
    WINDOW* peakWin = newwin(infodata->count.load(std::memory_order_relaxed)+2, (maxX - 1)/2, infodata->count.load(std::memory_order_relaxed)+5, 1);
    box(peakWin, 0, 0);
    mvwprintw(peakWin, 0, 2, " HighWater Tracker ");

    WINDOW* totalWin = newwin(infodata->count.load(std::memory_order_relaxed)+2, (maxX - 1)/2+1, infodata->count.load(std::memory_order_relaxed)+5, ((maxX - 1)/2)+1);
    box(totalWin, 0, 0);
    mvwprintw(totalWin, 0, 2, " Total Tracker ");


    while (getch() != 'q') {

        // --- Render Graph Window ---
        werase(graphWin);
        box(graphWin, 0, 0);
        mvwprintw(graphWin, 0, 2, " NuoDB Node.js Async Info ");
        
        int startX = infodata->namelen.load(std::memory_order_relaxed)+5;
        int barMaxLen = maxX - startX - 1;

        // Draw Tic Marks
        for (int i = 0; i <= (barMaxLen/10)-1; ++i) {
            int ticX = startX + (i * 10);
            mvwaddch(graphWin, infodata->count.load(std::memory_order_relaxed)+1, ticX, '+');
            mvwprintw(graphWin, infodata->count.load(std::memory_order_relaxed)+2, ticX - 1, "%d", i * 10);
        }

	// Draw Bars
        for (int i = 1; i < infodata->count.load(std::memory_order_relaxed); ++i) {
            mvwprintw(graphWin, 1 + i, 2, "%-*s: ", infodata->namelen.load(std::memory_order_relaxed),NuoJsDataNamesStrings.at(i).c_str(),"");
            
            // Draw # bar
            for (int j = 0; j < infodata->names[i].current.load(std::memory_order_relaxed); ++j) {
                mvwaddch(graphWin, 1 + i, startX + j, '#');
            }

            // High Water Mark |
            mvwaddch(graphWin, 1 + i, startX + infodata->names[i].high.load(std::memory_order_relaxed), ACS_VLINE);

            // Current Value
            mvwprintw(graphWin, 1 + i, infodata->namelen.load(std::memory_order_relaxed) + barMaxLen, "%d", infodata->names[i].current.load(std::memory_order_relaxed));
        }
        wrefresh(graphWin);

        // --- Render Peak Window ---
        werase(peakWin);
        box(peakWin, 0, 0);
        mvwprintw(peakWin, 0, 2, " HighWater Tracker (Current Time: %s) ", getFormattedTime().c_str());
        
        for (int i = 1; i < infodata->count.load(std::memory_order_relaxed); ++i) {
            mvwprintw(peakWin, 1 + i, 2, "%s: %d at %s", 
                NuoJsDataNamesStrings.at(i).c_str(), infodata->names[i].high.load(std::memory_order_relaxed), format_time_point(infodata->names[i].hightime.load(std::memory_order_relaxed)).c_str());
        }
        wrefresh(peakWin);
	
        // --- Render Total Window ---
        werase(totalWin);
        box(totalWin, 0, 0);
        mvwprintw(totalWin, 0, 2, " Total Tracker ");
        
        for (int i = 1; i < infodata->count.load(std::memory_order_relaxed); ++i) {
            mvwprintw(totalWin, 1 + i, 2, "%s: %d", 
                NuoJsDataNamesStrings.at(i).c_str(), infodata->names[i].total.load(std::memory_order_relaxed));
        }
        wrefresh(totalWin);
    }

    // Clean up
    delwin(graphWin);
    delwin(peakWin);
    delwin(totalWin);
    endwin();
    return 0;
}
