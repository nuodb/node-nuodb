#ifndef NUOJS_CONNECTION_H
#define NUOJS_CONNECTION_H

// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsAddon.h"

namespace NuoJs
{
class Connection : public Nan::ObjectWrap
{
public:
    Connection();
    virtual ~Connection();

    static NAN_MODULE_INIT(init);

    static NAN_METHOD(newInstance);

    static Local<Object> createFrom(class NuoDB::Connection*);

    static Nan::Persistent<Function> constructor;

private:

    static NAN_METHOD(execute);
    friend class ExecuteWorker;
    bool doExecute(NuoDB::PreparedStatement* statement);
    NuoDB::PreparedStatement* createStatement(std::string sql, Local<Array> binds);

    static NAN_METHOD(commit);
    friend class CommitWorker;
    void doCommit();

    static NAN_METHOD(rollback);
    friend class RollbackWorker;
    void doRollback();

    static NAN_METHOD(close);
    friend class ConnectionCloseWorker;
    void doClose();

    static NAN_GETTER(getReadOnly);
    bool isReadOnly() const;

    static NAN_SETTER(setReadOnly);
    void setReadOnly(bool mode);

    static NAN_GETTER(getAutoCommit);
    bool isAutoCommit() const;

    static NAN_SETTER(setAutoCommit);
    void setAutoCommit(bool mode);

    friend class Driver;

    bool isConnected() const;
    void setIsolationLevel(uint32_t isolation);

    class NuoDB::Connection* connection;
};
}

#endif
