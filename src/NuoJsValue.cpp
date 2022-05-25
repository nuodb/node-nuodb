// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsValue.h"

#include <sstream>
#include <iostream>

namespace NuoJs
{
SqlValue::SqlValue()
{}

SqlValue::SqlValue(const SqlValue& rhs)
    : name(rhs.name), sqlType(rhs.sqlType), u(rhs.u), s(rhs.s)
{}

std::string SqlValue::getName() const
{
    return name;
}
void SqlValue::setName(std::string s)
{
    name = s;
}

std::string SqlValue::getTable() const
{
    return table;
}
void SqlValue::setTable(std::string s)
{
    table = s;
}

int SqlValue::getSqlType() const
{
    return sqlType;
}
void SqlValue::setSqlType(int type)
{
    sqlType = type;
}

bool SqlValue::getBoolean() const
{
    return u.b;
}
void SqlValue::setBoolean(bool value)
{
    u.b = value;
}

float SqlValue::getFloat() const
{
    return u.f4;
}
void SqlValue::setFloat(float value)
{
    u.f4 = value;
}

double SqlValue::getDouble() const
{
    return u.f8;
}
void SqlValue::setDouble(double value)
{
    u.f8 = value;
}

int8_t SqlValue::getByte() const
{
    return u.i8;
}
void SqlValue::setByte(int8_t value)
{
    u.i8 = value;
}

int16_t SqlValue::getShort() const
{
    return u.i16;
}
void SqlValue::setShort(int16_t value)
{
    u.i16 = value;
}

int32_t SqlValue::getInt() const
{
    return u.i32;
}
void SqlValue::setInt(int32_t value)
{
    u.i32 = value;
}

int64_t SqlValue::getLong() const
{
    return u.i64;
}
void SqlValue::setLong(int64_t value)
{
    u.i64 = value;
}

std::string SqlValue::getString() const
{
    return s;
}
void SqlValue::setString(std::string value)
{
    s = value;
}

std::string int64ToString(int64_t v)
{
    std::ostringstream os;
    os << v;
    return os.str();
}
}
