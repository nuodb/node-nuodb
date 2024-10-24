// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsConnection.h"
#include "NuoJsErrMsg.h"
#include "NuoJsOptions.h"
#include "NuoJsTypes.h"
#include "NuoJsNan.h"
#include "NuoJsResultSet.h"
#include <iostream>

#include "NuoDB.h"
namespace NuoJs
{
Nan::Persistent<Function> Connection::constructor;

// Create a unique bitmask for each Connection setting that we can allow the developer
// using the driver can promise to use just the Conneciton API to set these properties
// and not set them through SQL commands.  With this restriction, we can avoid expensive
// calls on the NuoDB driver that involve network calls
// 
enum API_ID {
	READONLY = (1u << 0),
	AUTOCOMMIT = (1u << 1),
	ISOLATIONLEVEL = (1u << 2),
};

bool Connection::Default_AutoCommit = true;
bool Connection::Default_ReadOnly = false;
uint32_t Connection::Default_IsolationLevel = 7;

// This routine is used to translate the textual name used for an ENUM setting and get
// the actual bitmask value associated with it
// 
unsigned int str2int(const std::string& str) {
  if (str == std::string("READONLY")) {
    return(API_ID::READONLY);
  } else if (str == std::string("AUTOCOMMIT")) {
    return(API_ID::AUTOCOMMIT);
  } else if (str == std::string("ISOLATIONLEVEL")) {
    return(API_ID::ISOLATIONLEVEL);
  } else {
    std::string message = ErrMsg::get(ErrMsgType::errBadConfiguration, "Invalid Connection Only API Value");
    throw std::runtime_error(message);
  }
}

// This routine will take a string designed to use any number of textual bitmask names
// separated by | and return the appropriate bitmask for the combined values
//
unsigned int Connection::Restricted_API(const std::string& s) {
  std::string delimiter("|");
  unsigned int retvalue = 0;
  auto start = 0U;
  auto end = s.find(delimiter);
  while (end != std::string::npos)
  {
        retvalue |= str2int(s.substr(start, end - start));
        start = end + delimiter.length();
        end = s.find(delimiter, start);
    }

    retvalue |= str2int(s.substr(start, end));

  return retvalue;
}

Connection::Connection()
    : Nan::ObjectWrap()
{
    TRACE("Connection::Connection");
    _AutoCommit = Default_AutoCommit;
    _ReadOnly = Default_ReadOnly;
    _IsolationLevel = Default_IsolationLevel;
}

/* virtual */
Connection::~Connection()
{
    TRACE("Connection::~Connection");
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
    Nan::SetPrototypeMethod(tpl, "hasFailed", hasFailed);

    // See: https://medium.com/netscape/tutorial-building-native-c-modules-for-node-js-using-nan-part-1-755b07389c7c
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("autoCommit").ToLocalChecked(),
                     Connection::getAutoCommit, Connection::setAutoCommit);
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("readOnly").ToLocalChecked(),
                     Connection::getReadOnly, Connection::setReadOnly);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New<v8::String>("Connection").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());

    char* restrictedAPISetting;
    restrictedAPISetting = getenv("NUODB_NODE_CONNECTION_API_ONLY");
    if (restrictedAPISetting != NULL) {
	    setRestrictedAPI(Restricted_API(std::string(restrictedAPISetting)));
    }
}

unsigned int Connection::getRestrictedAPI() {
	//return Connection::noReuseReset;
	return Connection::restrictedAPI;
};

void Connection::setRestrictedAPI(unsigned int v) {
	Connection::restrictedAPI = v;
};

unsigned int Connection::restrictedAPI = 0;

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

class ConnectionCloseWorker : public Nan::AsyncWorker
{
public:
    ConnectionCloseWorker(Nan::Callback* callback, Connection* self)
        : Nan::AsyncWorker(callback), self(self)
    {
        TRACE("ConnectionCloseWorker::ConnectionCloseWorker");
    }

    virtual ~ConnectionCloseWorker()
    {
        TRACE("ConnectionCloseWorker::~ConnectionCloseWorker");
    }

    virtual void Execute()
    {
        TRACE("ConnectionCloseWorker::Execute");
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

    ConnectionCloseWorker* worker = new ConnectionCloseWorker(callback, self);
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
        std::string message = ErrMsg::get(ErrMsgType::errCommit, ErrMsg::get(e));
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
        std::string message = ErrMsg::get(ErrMsgType::errCommit, ErrMsg::get(e));
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
        std::string message = ErrMsg::get(ErrMsgType::errRollback, ErrMsg::get(e));
        throw std::runtime_error(message);
    }
}

class ExecuteWorker : public Nan::AsyncWorker
{
public:
    ExecuteWorker(Nan::Callback* callback, Connection* self, NuoDB::PreparedStatement* statement, Options options, const char* error)
        : Nan::AsyncWorker(callback), self(self), statement(statement), options(options), error(error), hasResults(false)
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
        if (error) {
            SetErrorMessage(error);
            return;
        }
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
        } else {
            statement->close();
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
    const char* error;
    bool hasResults;
};

/* static */
NAN_METHOD(Connection::execute)
{
    TRACE("Connection::execute");
    Nan::HandleScope scope;
    const char* error = nullptr;

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
    try {
      // Interogate the current connection to get its current properties that are in effect
      // I am not sure why the current code only sets and checks AutoCommit and ReadOnly and
      // not the Isolation Level
      // The strategy seems to get the current connecton settings and overwrite them with
      // any options that were passed in for execution.
      // Once the set of options have been determined, there is specific code that 
      // sets the resultant options for AutoCommit, IsolationLevel and ReadOnly
      // It would obviously be best if we can avoid making these calls since they result in
      // a newtork call
//      if (!NuoJs::Connection::getNoReuseReset()) {
//        options.setAutoCommit(self->isAutoCommit());
//        options.setReadOnly(self->isReadOnly());
//      }
      if (infoLen > infoIdx && !info[infoIdx]->IsFunction()) {
          try {
              getJsonOptions(info[infoIdx++].As<Object>(), options);
          } catch (std::exception& e) {
              Nan::ThrowError(e.what());
              return;
          }
      }
      if ((options.isNonDefault(Options::Option::isolationlevel)) && (self->_IsolationLevel != options.getIsolationLevel())) self->setIsolationLevel(options.getIsolationLevel());
      if ((options.isNonDefault(Options::Option::autocommit)) && (self->_AutoCommit != options.getAutoCommit())) self->setAutoCommit(options.getAutoCommit());
      if ((options.isNonDefault(Options::Option::readonly)) && (self->_ReadOnly != options.getReadOnly())) self->setReadOnly(options.getReadOnly());
//      self->setIsolationLevel(options.getIsolationLevel());
//      self->setAutoCommit(options.getAutoCommit());
//      self->setReadOnly(options.getReadOnly());
    } catch (std::exception& e) {
        error = e.what();
    }

    NuoDB::PreparedStatement* statement = nullptr;
    try {
        statement = self->createStatement(sql, binds);
	if (options.getQueryTimeout() != 0) {
        statement->setQueryTimeout(options.getQueryTimeout());
	}
    } catch (std::exception& e) {
        error = e.what();
    }

    Nan::Callback* callback = new Nan::Callback(info[infoIdx].As<Function>());

    ExecuteWorker* worker = new ExecuteWorker(callback, self, statement, options, error);
    worker->SaveToPersistent("nuodb:Connection", info.This());
    Nan::AsyncQueueWorker(worker);
}

NuoDB::PreparedStatement* Connection::createStatement(std::string sql, Local<Array> binds)
{
    Nan::HandleScope scope;
    Isolate* isolate = Isolate::GetCurrent();
    Local<Context> ctx = isolate->GetCurrentContext();

    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    NuoDB::PreparedStatement* statement = nullptr;
    try {
        statement = connection->prepareStatement(sql.c_str());
        for (size_t index = 0; index < binds->Length(); index++) {
            Local<Value> value = binds->Get(ctx, index).ToLocalChecked();

            int sqlIdx = index + 1;
            int sqlType = Type::fromEsType(typeOf(value));

            // The top-level case statements below correspond to the five
            // fundamental data types in ES. Within these types we need to
            // check if it will result in a safe conversion (e.g. Number).
            switch (sqlType) {
                case NuoDB::NUOSQL_UNDEFINED:
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
                case NuoDB::NUOSQL_DATE: {
		    int bufsize = 80;
                    char buffer[80];
		    // Initializing buffer to string termination so there is
		    // no possible unterminated string placed in the buffer.
		    memset(buffer,'\0',bufsize);
                    time_t seconds = (time_t)(toInt64(value) / 1000);
                    struct tm* timeinfo;
                    timeinfo = localtime(&seconds);
                    strftime(buffer, bufsize, "%F %T", timeinfo);
		    int strsize = strlen(buffer);
                    // buffer = "YYYY-MM-DD HH:MM:SS" -- 19 characters long
                    int ms = toInt64(value) % 1000;
                    buffer[strsize] = '.';
                    buffer[++strsize] = '0' + ms / 100;
                    ms %= 100;
                    buffer[++strsize] = '0' + ms / 10;
                    ms %= 10;
                    buffer[++strsize] = '0' + ms;
		    
		    assert (strsize < bufsize);

                    statement->setString(sqlIdx, buffer);
                    break;
                }

                default:{
                    statement->setString(sqlIdx, toString(value).c_str());
                    break;
                }
            }
        }
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(ErrMsg::get(e));
    }

    return statement;
}

// Look for any error message that should indicate the connection is no longer useable
// If we find a problem, then save the error message so the Connection is not reused
void Connection::markForFailure(NuoDB::SQLException& e) {
	const int code = e.getSqlcode();
	//const char *ptr1 = strstr(errorText,"Connection reset by peer");
	//const char *ptr2 = strstr(errorText,"connection closed");
	if ((code == -7) || 
	    (code == -10) ||
            (code == -50)) {
		failureText = ErrMsg::get(e);
	}
}

bool Connection::doExecute(NuoDB::PreparedStatement* statement)
{
    if (!isConnected()) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        return statement->execute();
    } catch (NuoDB::SQLException& e) {
	// Execution has failed, see if the failure should consider the connection dead
	markForFailure(e);
        throw std::runtime_error(ErrMsg::get(e));
    }
}

bool Connection::isFailed() const
{
    return !(isConnected() && failureText.empty());
}

NAN_METHOD(Connection::hasFailed)
{
    TRACE("Connection::hasFailed");
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    info.GetReturnValue().Set(Nan::New<Boolean>(self->isFailed()));
}

NAN_METHOD(Connection::isConnected)
{
    TRACE("Connection::isConnected");
//    std::cout << "NAN_METHOD Connection::isConnected" << std::endl;
    Nan::HandleScope scope;

    Connection* self = Nan::ObjectWrap::Unwrap<Connection>(info.This());

    info.GetReturnValue().Set(Nan::New<Boolean>(self->isConnected()));
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
    Isolate* isolate = Isolate::GetCurrent();

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
        self->setReadOnly(value->BooleanValue(isolate));
    }
}

// Get AutoCommit  mode synchronously.
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

// Set AutoCommit mode synchronously.
NAN_SETTER(Connection::setAutoCommit)
{

    TRACE("Connection::SetAutoCommit");
    Nan::HandleScope scope;
    Isolate* isolate = Isolate::GetCurrent();

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
        self->setAutoCommit(value->BooleanValue(isolate));
    }
}

bool Connection::isConnected() const
{
    return ((connection != nullptr) && (connection->isConnected()));
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
	if (((Connection::getRestrictedAPI()&API_ID::READONLY) == 0) || (mode != _ReadOnly)) {
          connection->setReadOnly(mode);
	  _ReadOnly = mode;
	}
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
	if (((Connection::getRestrictedAPI()&API_ID::AUTOCOMMIT) == 0) || (mode != _AutoCommit)) {
          connection->setAutoCommit(mode);
	  _AutoCommit = mode;
	} else {
	}

    }
}

void Connection::setIsolationLevel(uint32_t isolation)
{
    // guard!
    if (isConnected()) {
	if (((Connection::getRestrictedAPI()&API_ID::ISOLATIONLEVEL) == 0) || (isolation != _IsolationLevel)) {
          connection->setTransactionIsolation((int)isolation);
	  _IsolationLevel = isolation;
	}
    }
}
}
