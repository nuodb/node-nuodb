#include <stdio.h>

#include <exception>
#include <inttypes.h>

#include <napi.h>
#include <uv.h>

#include "NuoJsConnection.h"
#include "NuoJsResultSet.h"
#include "NuoJsErrMsg.h"
#include "NuoJsTypes.h"
#include "NuoJsNapiExtensions.h"

namespace NuoJs
{
using namespace Napi;

Napi::FunctionReference Connection::constructor;

Napi::Object Connection::init(Napi::Env env, Napi::Object exports)
{
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "Connection", {
            InstanceAccessor("autoCommit", &Connection::getAutoCommit, &Connection::setAutoCommit),
            InstanceAccessor("readOnly", &Connection::getReadOnly, &Connection::setReadOnly),
            InstanceMethod("execute", &Connection::execute),
            InstanceMethod("close", &Connection::close),
            InstanceMethod("commit", &Connection::commit)
        });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("Connection", func);

    return exports;
}

/* static */
Napi::Value Connection::newInstance(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        // N-API makes it exceedingly hard to implement RAII. The only way to implement RAII
        // is to wrap the Napi::CallbackInfo instance with a new Napi::Object, and pass that
        // as the only argument (so that later on in the constructor we can unwrap and get at
        // the original argument list); this is to effectively permit varargs C++ constructors.
        //
        // That seemed like a real headache, so we opted for the latter, to have the constructor
        // called, have it do nothing, and then delegate all the real work to the Connect method
        // of the unwrapped object.
        //
        // Construct and permit the object to survive the lifespan of this scope...
        Napi::EscapableHandleScope scope(env);
        Napi::Object that = constructor.New({ info[0] });
        scope.Escape(napi_value(that)).ToObject();
        Connection* c = ObjectWrap::Unwrap(that);
        return c->connect(info);
    } catch (std::exception& e) {
        // The following ThrowAsJavaScriptException and return need to be
        //  explained to the untrained eye.
        //
        // So you're seeing a whole lot of C++ here as we're using classes
        // in the Napi namespace. For the moment, set aside any assumptions
        // you have with regards to C++, and in reality don your C hat
        // instead...
        //
        // What these lines of code say is, in the executing environment
        // (the main event loop thread and related data structures), set
        // up the runtime so that when you exit the addon and return to
        // the event loop thread, THEN raise an exception on the Javascript
        // side. And in such cases, incidentally, any return values would
        // be ignored, so instead of returning an ordinary value or object,
        // instead return UNDEFINED.
        //
        // N.B.   NO C++ EXCEPTION IS BEING THROWN HERE  !!!
        std::string message = ErrMsg::get(ErrMsgType::errConnect, e.what());
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Connection::Connection(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Connection>(info), connectionIsOpen(false), statementIsOpen(false)
{}

class ConnectAsyncWorker : public Napi::AsyncWorker
{
public:
    // this transfers responsibility to cleanup config object to worker
    ConnectAsyncWorker(const Napi::Function& callback, Connection& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~ConnectAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doConnect();
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errOpen, e.what());
            SetError(message);
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined(), target.Value() });
    }

private:
    Connection& target;
};

// Connect to the database asynchronously.
Napi::Value Connection::connect(const Napi::CallbackInfo& info)
{
    TRACE("Connect");

    Napi::Env env = info.Env();

    // If we're called async, we have a config object and a callback. If we're
    // dealing with promises, we only have a config object...
    if (info.Length() < 1 || info.Length() > 2) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamCount, "connect");
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    if (!info[0].IsObject()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    Napi::Object options = info[0].As<Napi::Object>();

    // Retrievig the config must be done within the JS engine event loop.
    try {
        getJsonParams(info.Env(), options, params);
    } catch (std::exception& e) {
        std::string message = ErrMsg::get(ErrMsgType::errBadConfiguration, e.what());
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 2) {
        if (!info[1].IsFunction()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 1);
            Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[1].As<Napi::Function>();

        ConnectAsyncWorker* asyncWorker = new ConnectAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 1 only if this is called as a Promise.
    else if (info.Length() == 1) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            doConnect();
            deferred.Resolve(Value());
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errOpen, e.what());
            deferred.Reject(Napi::Error::New(env, message).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void Connection::doConnect()
{
    TRACE("doConnect");

    if (connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errAlreadyOpen);
        throw std::runtime_error(message);
    }
    connection = NuoDB::Connection::create();
    std::string connection_string = getConnectionString(params);

    // free properties!
    NuoDB::Properties* props = connection->allocProperties();
    props->putValue("user", params["user"].c_str());
    props->putValue("password", params["password"].c_str());
    props->putValue("schema", params["schema"].c_str());

    try {
        connection->openDatabase(connection_string.c_str(), props);
        connectionIsOpen = true;
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

class CommitAsyncWorker : public Napi::AsyncWorker
{
public:
    CommitAsyncWorker(const Napi::Function& callback, Connection& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~CommitAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doCommit();
        } catch (std::exception& e) {
            SetError(e.what());
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined() });
    }

private:
    Connection& target;
};

// Connect to the database asynchronously.
Napi::Value Connection::commit(const Napi::CallbackInfo& info)
{
    TRACE("Commit");

    Napi::Env env = info.Env();

    // If we're called async, we have a callback. If we're
    // dealing with promises, we have no arguments...
    if (info.Length() > 1) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamCount, "commit");
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 1) {
        if (!info[0].IsFunction()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
            Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[0].As<Napi::Function>();

        CommitAsyncWorker* asyncWorker = new CommitAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 0 only if this is called as a Promise.
    else if (info.Length() == 0) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            doCommit();
            deferred.Resolve(Value());
        } catch (std::exception& e) {
            deferred.Reject(Napi::Error::New(env, e.what()).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void Connection::doCommit()
{
    TRACE("doCommit");

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        connection->commit();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

class CloseAsyncWorker : public Napi::AsyncWorker
{
public:
    CloseAsyncWorker(const Napi::Function& callback, Connection& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~CloseAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doClose();
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseConnection, e.what());
            SetError(message);
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Napi::HandleScope scope(Env());
        Callback().Call({ Env().Undefined() });
    }

private:
    Connection& target;
};

Napi::Value Connection::close(const Napi::CallbackInfo& info)
{
    TRACE("Close");

    Napi::Env env = info.Env();

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 1) {
        if (!info[0].IsFunction()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
            Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[0].As<Napi::Function>();

        CloseAsyncWorker* asyncWorker = new CloseAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    }
    // Length is 0 only if this is called as a Promise.
    else if (info.Length() == 0) {
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            doClose();
            deferred.Resolve(Value());
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseConnection, e.what());
            deferred.Reject(Napi::Error::New(env, message).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void Connection::doClose()
{
    TRACE("Connection::doClose");

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        connectionIsOpen = false;
        connection->close();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

// Get auto-commit mode synchronously.
Napi::Value Connection::getAutoCommit(const Napi::CallbackInfo& info)
{
    TRACE("GetAutoCommit");

    Napi::Env env = info.Env();

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    try {
        return Napi::Boolean::New(info.Env(), connection->getAutoCommit());
    } catch (NuoDB::SQLException& e) {
        Napi::Error::New(env, e.getText()).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
}

// Set auto-commit mode synchronously.
void Connection::setAutoCommit(const Napi::CallbackInfo& info, const Napi::Value& value)
{
    TRACE("SetAutoCommit");

    Napi::Env env = info.Env();

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return;
    }

    if (!value.IsBoolean()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidTypeAssignment);
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return;
    }

    try {
        bool mode = value.As<Napi::Boolean>().Value();
        connection->setAutoCommit(mode);
    } catch (NuoDB::SQLException& e) {
        Napi::Error::New(env, e.getText()).ThrowAsJavaScriptException();
        return;
    }
}

// Get read-only mode synchronously.
Napi::Value Connection::getReadOnly(const Napi::CallbackInfo& info)
{
    TRACE("GetReadOnly");

    Napi::Env env = info.Env();

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    try {
        return Napi::Boolean::New(info.Env(), connection->isReadOnly());
    } catch (NuoDB::SQLException& e) {
        Napi::Error::New(env, e.getText()).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
}

// Set read-only mode synchronously.
void Connection::setReadOnly(const Napi::CallbackInfo& info, const Napi::Value& value)
{
    TRACE("SetReadOnly");

    Napi::Env env = info.Env();

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return;
    }

    if (!value.IsBoolean()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidTypeAssignment);
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return;
    }

    try {
        bool mode = value.As<Napi::Boolean>().Value();
        connection->setReadOnly(mode);
    } catch (NuoDB::SQLException& e) {
        Napi::Error::New(env, e.getText()).ThrowAsJavaScriptException();
        return;
    }
}

Context Connection::createContext()
{
    Context context;
    context.setConnection(connection);
    context.setIsConnectionOpen(connectionIsOpen);
    context.setStatement(statement);
    context.setIsStatementOpen(statementIsOpen);
    return context;
}

class ExecuteAsyncWorker : public Napi::AsyncWorker
{
public:
    ExecuteAsyncWorker(const Napi::Function& callback, Connection& target, std::string sql, Napi::Array binds)
        : Napi::AsyncWorker(callback), target(target), sql(sql), binds(binds)
    {}

    ~ExecuteAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doExecute(sql);
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errSqlExecute, e.what());
            SetError(message);
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    void OnOK()
    {
        Callback().Call({ Env().Undefined(), ResultSet::newInstance(Env(), target.createContext()) });
    }

private:
    Connection& target;
    std::string sql;
    Napi::Array binds;
};

/**
 * In the one execute method we need to handle four cases, both
 * with and without binds, then for each of those cases, variants
 * for async versus promise semantics. The various combinations
 * are as follows, and the code below follows this structure:
 *
 *  - sql with binds:
 *      all variants have at least the following arguments:
 *          {string, array}
 *    - promise:
 *          - (sql, binds) -> function (err, result) {}
 *              == {string, array}
 *              2 args!
 *    - async:
 *          - (sql, binds, function (err, result)) {}
 *              == {string, array, function}
 *              3 args!
 *
 *  - sql without binds
 *      all variants have at least the following arguments:
 *          {string}
 *    - promise:
 *          - (sql) -> function (err, result) {}
 *              == {string}
 *              1 args!
 *    - async:
 *          - (sql, function (err, result)) {}
 *              == {string, function}
 *              2 args!
 */
Napi::Value Connection::execute(const Napi::CallbackInfo& info)
{
    TRACE("Execute");

    Napi::Env env = info.Env();

    // validate bounds of info array
    if (info.Length() < 1 || info.Length() > 3) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamCount, "execute");
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    // first parameter is always a SQL DDL or DML string
    if (!info[0].IsString()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    Napi::String sql = info[0].As<Napi::String>();

    if (info.Length() > 1 && info[1].IsArray()) {
        Napi::Array binds = info[1].As<Napi::Array>();
        statement = prepareStatement(sql, binds);

        if (info.Length() == 2) {
            // sql-string, [binds] -> promise (DEFER PROMISES)
            // todo ...
        } else {
            // sql-string, [binds], function (err, result)
            if (!info[2].IsFunction()) {
                std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 2);
                Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
                return info.Env().Undefined();
            }
            Napi::Function callback = info[2].As<Napi::Function>();
            ExecuteAsyncWorker* asyncWorker = new ExecuteAsyncWorker(callback, *this, sql, binds);
            asyncWorker->Queue();
            return info.Env().Undefined();
        }
    } else {
        // validate bounds of info array
        if (info.Length() == 3) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamCount, "execute");
            Napi::Error::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Array binds = Array::New(env);
        statement = prepareStatement(sql, binds);
        if (info.Length() == 1) {
            // sql-string -> promise (DEFER PROMISES)
            // ...
        } else {
            // sql-string, function (err, result)
            if (!info[1].IsFunction()) {
                std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 1);
                Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
                return info.Env().Undefined();
            }
            Napi::Function callback = info[1].As<Napi::Function>();
            ExecuteAsyncWorker* asyncWorker = new ExecuteAsyncWorker(callback, *this, sql, binds);
            asyncWorker->Queue();
            return info.Env().Undefined();
        }
    }
    return info.Env().Undefined();
}

NuoDB::PreparedStatement* Connection::prepareStatement(std::string sql, Napi::Array binds)
{
    TRACE("prepareStatement");

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        NuoDB::PreparedStatement* statement = connection->prepareStatement(sql.c_str());
        for (size_t index = 0; index < binds.Length(); index++) {
            Napi::Value value = binds[index];

            int sqlIdx = index + 1;
            int sqlType = Type::fromEsType(value.Type());

            // The top-level case statements below correspond to the five
            // fundamental data types in ES. Within these types we need to
            // check if it will result in a safe conversion (e.g. Number).
            switch (sqlType) {
                case NuoDB::SqlType::NUOSQL_NULL:
                    statement->setNull(sqlIdx, NuoDB::NUOSQL_NULL);
                    break;

                case NuoDB::SqlType::NUOSQL_BOOLEAN:
                    statement->setBoolean(sqlIdx, value.ToBoolean());
                    break;

                case NuoDB::SqlType::NUOSQL_DOUBLE:
                    // If the value can be safely coerced to a sized integer
                    // or float without loss of precision, send a numeric
                    // value rather than a string. If we're dealing with
                    // a number that is larger than can be safely coerced,
                    // convert it to a string.
                    if (isInt16(value.Env(), value)) {
                        statement->setShort(sqlIdx, (int16_t)(int32_t)value.ToNumber());
                    } else if (isInt32(value.Env(), value)) {
                        statement->setInt(sqlIdx, (int32_t)value.ToNumber());
                    } else if (isFloat(value.Env(), value)) {
                        statement->setFloat(sqlIdx, (float)value.ToNumber());
                    } else {
                        statement->setString(sqlIdx, ((std::string)value.ToString()).c_str());
                    }
                    break;

                case NuoDB::SqlType::NUOSQL_VARCHAR: {
                    Napi::String ns = value.ToString();
                    statement->setString(sqlIdx, ((std::string)ns).c_str());
                    break;
                }

                case NuoDB::NUOSQL_UNDEFINED:
                    if (isDate(value.Env(), value)) {
                        char buffer[80];
                        time_t seconds = (time_t)(value.ToNumber().Int64Value() / 1000);
                        struct tm* timeinfo;
                        timeinfo = localtime(&seconds);
                        strftime(buffer, 80, "%F %T", timeinfo);
                        statement->setString(sqlIdx, buffer);
                    } else {
                        Napi::String ns = value.ToString();
                        statement->setString(sqlIdx, ((std::string)ns).c_str());
                    }
                    break;
            }
        }
        statementIsOpen = true;
        return statement;
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

void Connection::doExecute(std::string sql)
{
    TRACE("doExecute");

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        statement->execute();
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}

NuoDB::ResultSet* Connection::getResultSet()
{
    TRACE("getResultSet");

    if (!connectionIsOpen) {
        std::string message = ErrMsg::get(ErrMsgType::errConnectionClosed);
        throw std::runtime_error(message);
    }

    try {
        return statement->getResultSet();
/*
        if (rs) {
            while (rs->next()) {
                NuoDB::ResultSetMetaData* metaData = rs->getMetaData();
                auto columns = metaData->getColumnCount();
                printf("cols: %d\n", columns);
                for (auto index = 0; index < columns; index++) {
                    printf("type [%d]: %d\n", index + 1, metaData->getColumnType(index + 1));
                }
                printf("found result\n");
            }
            rs->close();
        }
*/
    } catch (NuoDB::SQLException& e) {
        throw std::runtime_error(e.getText());
    }
}
} // namespace NuoJs
