// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsConnection.h"
#include "NuoJsErrMsg.h"
#include "NuoJsOptions.h"
#include "NuoJsTypes.h"
#include "NuoJsNan.h"
#include "NuoJsResultSet.h"

#include "NuoDB.h"

namespace NuoJs
{
Nan::Persistent<Function> Connection::constructor;

Connection::Connection()
    : Nan::ObjectWrap()
{
    TRACE("Connection::Connection");
}

/* virtual */
Connection::~Connection()
{
    TRACE("Connection::~Connection");
    printf("c");
}

/* static */
NAN_MODULE_INIT(Connection::init)
{
    TRACE("Connection::init");
    Nan::HandleScope scope;

    // prepare constructor template...
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(Connection::newInstance);
    tpl->SetClassName(Nan::New("Connection").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // prototypes...
    Nan::SetPrototypeMethod(tpl, "close", close);
    Nan::SetPrototypeMethod(tpl, "commit", commit);
    Nan::SetPrototypeMethod(tpl, "execute", execute),
    Nan::SetPrototypeMethod(tpl, "rollback", rollback);

    // See: https://medium.com/netscape/tutorial-building-native-c-modules-for-node-js-using-nan-part-1-755b07389c7c
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("autoCommit").ToLocalChecked(),
                     Connection::getAutoCommit, Connection::setAutoCommit);
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("readOnly").ToLocalChecked(),
                     Connection::getReadOnly, Connection::setReadOnly);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New<v8::String>("Connection").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

/* static */
NAN_METHOD(Connection::newInstance)
{
    TRACE("Connection::newInstance");
    Nan::HandleScope scope;
    if (info.IsConstructCall()) {
        Connection* obj = new Connection();
        obj->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    } else {
        Local<Function> cons = Nan::New<Function>(constructor);
        info.GetReturnValue().Set(Nan::NewInstance(cons).ToLocalChecked());
    }
}

/* static */
Local<Object> Connection::createFrom(class NuoDB::Connection* conn)
{
    Nan::EscapableHandleScope scope;
    Local<Function> cons = Nan::New<Function>(Connection::constructor);
    Local<Object> obj = Nan::NewInstance(cons).ToLocalChecked();
    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(obj);
    self->connection = conn;
    return scope.Escape(obj);
}

class CloseWorker : public Nan::AsyncWorker
{
public:
    CloseWorker(Nan::Callback* callback, Connection* self)
        : Nan::AsyncWorker(callback), self(self)
    {
        TRACE("CloseWorker::CloseWorker");
    }

    virtual ~CloseWorker()
    {
        TRACE("CloseWorker::~CloseWorker");
    }

    virtual void Execute()
    {
        TRACE("CloseWorker::Execute");
        try {
            self->doClose();
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseConnection, e.what());
            SetErrorMessage(message.c_str());
        }
    }

    virtual void HandleOKCallback()
    {
        TRACE("ConnectWorker::HandleOKCallback");
        Nan::HandleScope scope;
        Local<Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    }

protected:
    Connection* self;
};

/* static */
NAN_METHOD(Connection::close)
{
    TRACE("Connection::close");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }
    Nan::Callback* callback = new Nan::Callback(info[0].As<Function>());

    CloseWorker* worker = new CloseWorker(callback, self);
    worker->SaveToPersistent("nuodb:Connection", info.This());
    Nan::AsyncQueueWorker(worker);
}

void Connection::doClose()
{
    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        connection->close();
        connection = nullptr;
    } catch (NuoDB::SQLException& e) {
        std::string message = ErrMsg::get(ErrMsgType::errCommit, e.getText());
        throw std::runtime_error(message);
    }
}

class CommitWorker : public Nan::AsyncWorker
{
public:
    CommitWorker(Nan::Callback* callback, Connection* self)
        : Nan::AsyncWorker(callback), self(self)
    {
        TRACE("CommitWorker::CommitWorker");
    }

    virtual ~CommitWorker()
    {
        TRACE("CommitWorker::~CommitWorker");
    }

    virtual void Execute()
    {
        TRACE("CommitWorker::Execute");
        try {
            self->doCommit();
        } catch (std::exception& e) {
            SetErrorMessage(e.what());
        }
    }

    virtual void HandleOKCallback()
    {
        TRACE("ConnectWorker::HandleOKCallback");
        Nan::HandleScope scope;
        Local<Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    }

protected:
    Connection* self;
};

/* static */
NAN_METHOD(Connection::commit)
{
    TRACE("Connection::commit");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }
    Nan::Callback* callback = new Nan::Callback(info[0].As<Function>());

    CommitWorker* worker = new CommitWorker(callback, self);
    worker->SaveToPersistent("nuodb:Connection", info.This());
    Nan::AsyncQueueWorker(worker);
}

void Connection::doCommit()
{
    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        connection->commit();
    } catch (NuoDB::SQLException& e) {
        std::string message = ErrMsg::get(ErrMsgType::errCommit, e.getText());
        throw std::runtime_error(message);
    }
}

class RollbackWorker : public Nan::AsyncWorker
{
public:
    RollbackWorker(Nan::Callback* callback, Connection* self)
        : Nan::AsyncWorker(callback), self(self)
    {
        TRACE("RollbackWorker::RollbackWorker");
    }

    virtual ~RollbackWorker()
    {
        TRACE("RollbackWorker::~RollbackWorker");
    }

    virtual void Execute()
    {
        TRACE("RollbackWorker::Execute");
        try {
            self->doRollback();
        } catch (std::exception& e) {
            SetErrorMessage(e.what());
        }
    }

    virtual void HandleOKCallback()
    {
        TRACE("ConnectWorker::HandleOKCallback");
        Nan::HandleScope scope;
        Local<Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    }

protected:
    Connection* self;
};

/* static */
NAN_METHOD(Connection::rollback)
{
    TRACE("Connection::rollback");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }
    Nan::Callback* callback = new Nan::Callback(info[0].As<Function>());

    RollbackWorker* worker = new RollbackWorker(callback, self);
    worker->SaveToPersistent("nuodb:Connection", info.This());
    Nan::AsyncQueueWorker(worker);
}

void Connection::doRollback()
{
    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        connection->rollback();
    } catch (NuoDB::SQLException& e) {
        std::string message = ErrMsg::get(ErrMsgType::errRollback, e.getText());
        throw std::runtime_error(message);
    }
}

class ExecuteWorker : public Nan::AsyncWorker
{
public:
    ExecuteWorker(Nan::Callback* callback, Connection* self, NuoDB::PreparedStatement* statement, Options options)
        : Nan::AsyncWorker(callback), self(self), statement(statement), options(options), hasResults(false)
    {
        TRACE("ExecuteWorker::ExecuteWorker");
    }

    virtual ~ExecuteWorker()
    {
        TRACE("ExecuteWorker::~ExecuteWorker");
    }

    virtual void Execute()
    {
        TRACE("ExecuteWorker::Execute");
        try {
            hasResults = self->doExecute(statement);
        } catch (std::exception& e) {
            SetErrorMessage(e.what());
        }
    }

    virtual void HandleOKCallback()
    {
        TRACE("ExecuteWorker::HandleOKCallback");
        Nan::HandleScope scope;
        Local<Value> results = Nan::Undefined();
        if (hasResults) {
            TRACE(">>>>>> HAS RESULTS");
            results = ResultSet::createFrom(statement, options);
            // todo result set maintain strong reference to connection to prevent connection from closing early
        }
        Local<Value> argv[] = {
            Nan::Null(),
            results
        };
        callback->Call(2, argv, async_resource);
    }

protected:
    Connection* self;
    NuoDB::PreparedStatement* statement;
    Options options;
    bool hasResults;
};

/* static */
NAN_METHOD(Connection::execute)
{
    TRACE("Connection::execute");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }

    // first parameter is always a SQL DDL or DML string
    if (!info[0]->IsString()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }
    Nan::Utf8String sqlString(info[0].As<String>());
    std::string sql(*sqlString);

    // binds (optional), track the index if they are present...
    auto infoIdx = 1;
    auto infoLen = info.Length();
    Local<Array> binds = Nan::New<Array>(0);
    if (infoLen > 1 && info[infoIdx]->IsArray()) {
        binds = info[infoIdx++].As<Array>();
    }

    // query options (optional) that can be specified by the user
    Options options;
    options.setAutoCommit(self->isAutoCommit());
    options.setReadOnly(self->isReadOnly());
    if (infoLen > infoIdx && !info[infoIdx]->IsFunction()) {
        try {
            getJsonOptions(info[infoIdx++].As<Object>(), options);
        } catch (std::exception& e) {
            Nan::ThrowError(e.what());
            return;
        }
    }
    self->setIsolationLevel(options.getIsolationLevel());
    self->setAutoCommit(options.getAutoCommit());
    self->setReadOnly(options.getReadOnly());

    NuoDB::PreparedStatement* statement = self->createStatement(sql, binds);

    Nan::Callback* callback = new Nan::Callback(info[infoIdx].As<Function>());

    ExecuteWorker* worker = new ExecuteWorker(callback, self, statement, options);
    worker->SaveToPersistent("nuodb:Connection", info.This());
    Nan::AsyncQueueWorker(worker);
}

NuoDB::PreparedStatement* Connection::createStatement(std::string sql, Local<Array> binds)
{
    Nan::HandleScope scope;

    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    NuoDB::PreparedStatement* statement = connection->prepareStatement(sql.c_str());
    for (size_t index = 0; index < binds->Length(); index++) {
        Local<Value> value = binds->Get(index);

        int sqlIdx = index + 1;
        int sqlType = Type::fromEsType(typeOf(value));

        // The top-level case statements below correspond to the five
        // fundamental data types in ES. Within these types we need to
        // check if it will result in a safe conversion (e.g. Number).
        switch (sqlType) {
            case NuoDB::SqlType::NUOSQL_NULL:
                statement->setNull(sqlIdx, NuoDB::NUOSQL_NULL);
                break;

            case NuoDB::SqlType::NUOSQL_BOOLEAN:
                statement->setBoolean(sqlIdx, toBool(value));
                break;

            case NuoDB::SqlType::NUOSQL_DOUBLE:
                // If the value can be safely coerced to a sized integer
                // or float without loss of precision, send a numeric
                // value rather than a string. If we're dealing with
                // a number that is larger than can be safely coerced,
                // convert it to a string.
                if (isInt16(value)) {
                    statement->setShort(sqlIdx, toInt16(value));
                } else if (isInt32(value)) {
                    statement->setInt(sqlIdx, toInt32(value));
                } else if (isFloat(value)) {
                    statement->setFloat(sqlIdx, toFloat(value));
                } else {
                    statement->setDouble(sqlIdx, toDouble(value));
                }
                break;

            case NuoDB::SqlType::NUOSQL_VARCHAR: {
                statement->setString(sqlIdx, toString(value).c_str());
                break;
            }

            case NuoDB::NUOSQL_UNDEFINED:
                if (isDate(value)) {
                    char buffer[80];
                    time_t seconds = (time_t)(toInt64(value) / 1000);
                    struct tm* timeinfo;
                    timeinfo = localtime(&seconds);
                    strftime(buffer, 80, "%F %T", timeinfo);
                    statement->setString(sqlIdx, buffer);
                } else {
                    statement->setString(sqlIdx, toString(value).c_str());
                }
                break;
        }
    }

    return statement;
}

bool Connection::doExecute(NuoDB::PreparedStatement* statement)
{
    try {
        return statement->execute();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

// Get read-only mode synchronously.
NAN_GETTER(Connection::getReadOnly)
{
    TRACE("Connection::GetReadOnly");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!self->isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    info.GetReturnValue().Set(Nan::New<Boolean>(self->isReadOnly()));
}

// Set read-only mode synchronously.
NAN_SETTER(Connection::setReadOnly)
{
    TRACE("Connection::SetReadOnly");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!self->isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    if (value.IsEmpty() || !value->IsBoolean()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidTypeAssignment);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    if (!value.IsEmpty() && value->IsBoolean()) {
        self->setReadOnly(value->BooleanValue());
    }
}

// Get read-only mode synchronously.
NAN_GETTER(Connection::getAutoCommit)
{
    TRACE("Connection::GetAutoCommit");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!self->isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    info.GetReturnValue().Set(Nan::New<Boolean>(self->isAutoCommit()));
}

// Set read-only mode synchronously.
NAN_SETTER(Connection::setAutoCommit)
{
    TRACE("Connection::SetAutoCommit");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    if (!self->isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    if (value.IsEmpty() || !value->IsBoolean()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidTypeAssignment);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }

    if (!value.IsEmpty() && value->IsBoolean()) {
        self->setAutoCommit(value->BooleanValue());
    }
}

bool Connection::isConnected() const
{
    return connection != nullptr && connection->isConnected();
}

bool Connection::isReadOnly() const
{
    // guard!
    return isConnected() && connection->isReadOnly();
}

void Connection::setReadOnly(bool mode)
{
    // guard!
    if (isConnected()) {
        connection->setReadOnly(mode);
    }
}

bool Connection::isAutoCommit() const
{
    // guard!
    return isConnected() && connection->getAutoCommit();
}

void Connection::setAutoCommit(bool mode)
{
    // guard!
    if (isConnected()) {
        connection->setAutoCommit(mode);
    }
}

void Connection::setIsolationLevel(uint32_t isolation)
{
    // guard!
    if (isConnected()) {
        connection->setTransactionIsolation((int)isolation);
    }
}
}
