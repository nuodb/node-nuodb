#ifndef NUOJS_CONNECTION_H
#define NUOJS_CONNECTION_H

// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsAddon.h"
#include "NuoDB.h"
#include <string>

namespace NuoJs
{
class Connection : public Nan::ObjectWrap
{
public:

    static bool Default_AutoCommit;
    static bool Default_ReadOnly;
    static uint32_t Default_IsolationLevel;

    Connection();
    virtual ~Connection();

    static NAN_MODULE_INIT(init);

    static NAN_METHOD(newInstance);

    static Local<Object> createFrom(class NuoDB::Connection*);

    static Nan::Persistent<Function> constructor;

    static unsigned int getRestrictedAPI();
    static void setRestrictedAPI(unsigned int);
    static unsigned int Restricted_API(const std::string&);

    bool _AutoCommit;
    bool _ReadOnly;
    uint32_t _IsolationLevel;

    void markForFailure(NuoDB::SQLException& e);

    static NAN_METHOD(hasFailed);
    bool isFailed() const;

private:

    static unsigned int restrictedAPI;
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


    static NAN_METHOD(isConnected);
    bool isConnected() const;

    //SQLException failure;
    std::string failureText;

    friend class Driver;

    void setIsolationLevel(uint32_t isolation);

    class NuoDB::Connection* connection;
};
}

#endif
