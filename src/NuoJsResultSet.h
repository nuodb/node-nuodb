// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_RESULTSET_H
#define NUOJS_RESULTSET_H

#include "NuoJsAddon.h"
#include "NuoJsOptions.h"
#include "NuoJsValue.h"

namespace NuoJs
{
class ResultSet : public Nan::ObjectWrap
{
public:
    ResultSet();

    virtual ~ResultSet();

    static NAN_MODULE_INIT(init);

    static NAN_METHOD(newInstance);

    static Local<Object> createFrom(class NuoDB::Statement*, Options options);

    static Nan::Persistent<Function> constructor;

private:

    // Release a database result set asynchronously.
    static NAN_METHOD(close);
    friend class ResultSetCloseWorker;
    void doClose();

    static NAN_METHOD(getRows);
    friend class GetRowsWorker;
    void doGetRows(size_t);

    // Internal method to convert row buffers to a Napi::Array.
    Local<Value> getRowsAsJsValue();

    class NuoDB::Statement* statement;
    bool isStatementOpen() const;

    class NuoDB::ResultSet* result;
    bool isResultOpen() const;

    Options options;
    std::vector<std::vector<SqlValue> > rows;
};
} // namespace NuoJs

#endif
