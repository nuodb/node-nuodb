// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_OPTIONS_H
#define NUOJS_OPTIONS_H

#include "NuoJsAddon.h"
#include "NuoJsRowMode.h"

namespace NuoJs
{
// QueryOptions tailor the behavior of executing queries.
class Options
{
public:
    // Options constructor sets reasonable defaults.
    Options();
    Options(const Options& options);
    Options& operator=(const Options& options);

    RowMode getRowMode() const;
    void setRowMode(RowMode);

    uint32_t getFetchSize() const;
    void setFetchSize(uint32_t);

    uint32_t getIsolationLevel() const;
    void setIsolationLevel(uint32_t v);

    bool getAutoCommit() const;
    void setAutoCommit(bool);

    bool getReadOnly() const;
    void setReadOnly(bool);

    uint32_t getQueryTimeout() const;
    void setQueryTimeout(uint32_t);
private:
    RowMode rowMode;
    uint32_t fetchSize;
    uint32_t isolationLevel;
    bool autoCommit;
    bool readOnly;
    uint32_t queryTimeout;
};

// getJsonOptions returns the JSON query options provided by the user
void getJsonOptions(Local<Object> object, Options& options);
}

#endif
