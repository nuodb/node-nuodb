// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsOptions.h"
#include "NuoJsErrMsg.h"
#include "NuoJsJson.h"

#include <stdio.h>
#include <iostream>

namespace NuoJs
{
const uint32_t CONSISTENT_READ = 7;

Options::Options()
    // defaults for all statement options
    : rowMode(ROWS_AS_OBJECT),
      fetchSize(0),
      isolationLevel(CONSISTENT_READ),
      autoCommit(true),
      readOnly(false),
      queryTimeout(0)
{}

Options::Options(const Options& options)
    : rowMode(options.rowMode),
      fetchSize(options.fetchSize),
      autoCommit(options.autoCommit),
      readOnly(options.readOnly),
      queryTimeout(options.queryTimeout)
{}

Options& Options::operator=(const Options& options)
{
    this->rowMode = options.rowMode;
    this->fetchSize = options.fetchSize;
    this->autoCommit = options.autoCommit;
    this->readOnly = options.readOnly;
    this->queryTimeout = options.queryTimeout;
    return *this;
}

bool Options::operator==(const Options& rhs) const {
	return (rowMode == rhs.rowMode) &&
	       (fetchSize == rhs.fetchSize) &&
	       (isolationLevel == rhs.isolationLevel) &&
	       (autoCommit == rhs.autoCommit) &&
	       (readOnly == rhs.readOnly);
}

RowMode Options::getRowMode() const
{
    return rowMode;
}

void Options::setRowMode(RowMode v)
{
    if (v != rowMode){
      setNonDefault(Option::rowmode);
      rowMode = v;
    }
}

uint32_t Options::getFetchSize() const
{
    return fetchSize;
}

void Options::setFetchSize(uint32_t v)
{
    if (v != fetchSize) {
      setNonDefault(Option::fetchsize);
      fetchSize = v;
    }
}

uint32_t Options::getIsolationLevel() const
{
    return isolationLevel;
}

void Options::setIsolationLevel(uint32_t v)
{
    if (v != isolationLevel) {
      setNonDefault(Option::isolationlevel);
      isolationLevel = v;
    }
}

bool Options::getAutoCommit() const
{
    return autoCommit;
}

void Options::setAutoCommit(bool v)
{
    if (v != autoCommit) {
      setNonDefault(Option::autocommit);
      autoCommit = v;
    }
}

bool Options::getReadOnly() const
{
    return readOnly;
}

void Options::setReadOnly(bool v)
{
    if (v != readOnly) {
      setNonDefault(Option::readonly);
      readOnly = v;
    }
}

uint32_t Options::getQueryTimeout() const
{
    return queryTimeout;
}

void Options::setQueryTimeout(uint32_t v)
{
    if (v != queryTimeout) {
      setNonDefault(Option::querytimeout);
      queryTimeout = v;
    }
}

RowMode toRowMode(uint32_t value)
{
    return (value == ROWS_AS_OBJECT) ? ROWS_AS_OBJECT : ROWS_AS_ARRAY;
}

void getJsonOptions(Local<Object> object, Options& options)
{
    options.setRowMode(toRowMode(getJsonUint(object, "rowMode", options.getRowMode())));
    options.setFetchSize(getJsonUint(object, "fetchSize", options.getFetchSize()));
    options.setIsolationLevel(getJsonUint(object, "isolationLevel", options.getIsolationLevel()));
    options.setAutoCommit(getJsonBoolean(object, "autoCommit", options.getAutoCommit()));
    options.setReadOnly(getJsonBoolean(object, "readOnly", options.getReadOnly()));
    options.setQueryTimeout(getJsonUint(object, "queryTimeout", options.getQueryTimeout()));
}

void Options::setNonDefault(Options::Option bit) 
{
	defaults |= 1 << (int) bit;
}

void Options::unsetNonDefault(Options::Option bit)
{
	defaults &= ~(1<<(int)bit);
}

bool Options::isNonDefault(Options::Option bit)
{
	if ((defaults & (1 << (int)bit)) != 0)
		return true;
	else
		return false;
}
}