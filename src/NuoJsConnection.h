#ifndef NUOJS_CONNECTION_H
#define NUOJS_CONNECTION_H

#include <napi.h>
#include "NuoJsAddon.h"
#include "NuoJsParams.h"
#include "NuoJsContext.h"

// nuodb emits lots of warnings about this; so disable it
#ifdef __APPLE__
# pragma clang diagnostic ignored "-Woverloaded-virtual"
#endif
#include "NuoDB.h"

namespace NuoJs
{
class Connection : public Napi::ObjectWrap<Connection>
{
public:
    // Initialize the class system with connection type info.
    static Napi::Object init(Napi::Env env, Napi::Object exports);

    // Constructs an object that wraps the value provided by the user.
    // The object returned from NewInstance is callback.info[0] passed
    // to the class constructor further below.
    static Napi::Value newInstance(const Napi::CallbackInfo& info);

    // Constructs a connection object from the value created in
    // NewInstance, above, which is in info[0].
    Connection(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;

    // Connect to a database asynchronously.
    Napi::Value connect(const Napi::CallbackInfo& info);

    // Execute a SQL statement asynchronously.
    Napi::Value execute(const Napi::CallbackInfo& info);

    // Commit a database transaction asynchronously.
    Napi::Value commit(const Napi::CallbackInfo& info);

    // Release a database connection asynchronously.
    Napi::Value close(const Napi::CallbackInfo& info);

    // Get the auto commit mode synchronously (accessor).
    Napi::Value getAutoCommit(const Napi::CallbackInfo& info);

    // Set the auto commit mode synchronously (accessor).
    void setAutoCommit(const Napi::CallbackInfo& info, const Napi::Value& value);

    // Get the read only mode synchronously (accessor).
    Napi::Value getReadOnly(const Napi::CallbackInfo& info);

    // Set the read only mode synchronously (accessor).
    void setReadOnly(const Napi::CallbackInfo& info, const Napi::Value& value);

    // Internal connect method that works against a NuoDB connection object.
    void doConnect();

    // Internal execute method that works against a NuoDB connection object.
    void doExecute(std::string sql);

    // Internal method to get the result set after having executed SQL.
    NuoDB::ResultSet* getResultSet();

    // Internal commit method that works against a NuoDB connection object.
    void doCommit();

    // Internal close method that works against a NuoDB connection object.
    void doClose();

    // Internal method to prepare a statement and set its binds.
    NuoDB::PreparedStatement* prepareStatement(std::string sql, Napi::Array binds);

    // Internal method to create a context from this object.
    Context createContext();

    // Async worker for creating connections.
    friend class ConnectAsyncWorker;
    // Async worker for committing transactions.
    friend class CommitAsyncWorker;
    // Async worker for releasing connections.
    friend class CloseAsyncWorker;
    // Async worker for executing a statement.
    friend class ExecuteAsyncWorker;

    Params params;

    NuoDB::Connection* connection;
    bool connectionIsOpen;

    NuoDB::PreparedStatement* statement;
    bool statementIsOpen;
};
}

#endif
