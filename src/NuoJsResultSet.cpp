#include "NuoJsResultSet.h"
#include "NuoJsErrMsg.h"
#include "NuoJsNapiExtensions.h"
#include "NuoJsValue.h"
#include "NuoJsTypes.h"
#include "NuoDB.h"

namespace NuoJs
{
Napi::FunctionReference ResultSet::constructor;

Napi::Object ResultSet::init(Napi::Env env, Napi::Object exports)
{
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "ResultSet", {
            InstanceMethod("getRows", &ResultSet::getRows),
            InstanceMethod("close", &ResultSet::close) });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("ResultSet", func);

    return exports;
}

Napi::Value ResultSet::newInstance(Napi::Env env, const Context& c)
{
    Napi::EscapableHandleScope scope(env);
    Napi::Object that = constructor.New({});
    ResultSet* object = Napi::ObjectWrap<ResultSet>::Unwrap(that);
    object->context = c;
    return scope.Escape(napi_value(that)).ToObject();
}

ResultSet::ResultSet(const Napi::CallbackInfo& info) : Napi::ObjectWrap<ResultSet>(info)
{}

class GetRowsAsyncWorker : public Napi::AsyncWorker
{
public:
    GetRowsAsyncWorker(const Napi::Function& callback, ResultSet& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~GetRowsAsyncWorker()
    {}

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    void Execute()
    {
        try {
            target.doGetRows();
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseResultSet, e.what());
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
        printf("VALIDATING, ROWS BUFFERED: %zu\n", target.context.getRowsFetched());
        Napi::Value value = target.getRowsAsJsValue(Env());
        Callback().Call({ Env().Undefined(), value });
    }

private:
    ResultSet& target;
};

/**
 * getRows is used to retrieve rows from the result set.
 *
 * getRows can have two or fewer parameters.
 *
 * (optional) Number :      an integer indicating the count of rows to be
 *                          returned. If unspecified, the method returns all
 *                          rows. This must be the first parameter.
 *                          Negative one (-1) is a sentinel value that means
 *                          "all".
 * (optional) Function :    an error-first callback if this method is called
 *                          asynchronously; if omitted, then a promise is
 *                          returned.
 */
Napi::Value ResultSet::getRows(const Napi::CallbackInfo& info)
{
    TRACE("getRows");
    Napi::Env env = info.Env();

    if (info.Length() < 1 || info.Length() > 2) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamCount, "rows");
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    if (!info[0].IsNumber() || !isInt32(env, info[0])) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
        Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    size_t rowsToRead = info[0].As<Napi::Number>().Int32Value();
    if (rowsToRead == 0) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamValue, 0);
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    context.setFetchSize(rowsToRead);

    if (info.Length() > 1) {
        // async ...
        if (!info[1].IsFunction()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 1);
            Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[1].As<Napi::Function>();
        GetRowsAsyncWorker* asyncWorker = new GetRowsAsyncWorker(callback, *this);
        asyncWorker->Queue();
        return info.Env().Undefined();
    } else {
        // promise...
        auto deferred = Napi::Promise::Deferred::New(env);
        try {
            // get an array of internal values
            doGetRows();
            deferred.Resolve(getRowsAsJsValue(env));
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errGetRows, e.what());
            deferred.Reject(Napi::Error::New(env, message).Value());
        }
        return deferred.Promise();
    }
    return env.Undefined();
}

Napi::Value sqlToEsValue(Napi::Env env, SqlValue sqlValue)
{
    int sqlType = sqlValue.getSqlType();
    int esType = Type::toEsType(sqlType);
    switch (esType) {
        case ES_BOOLEAN:
            printf("ES_BOOLEAN\n");
            return Napi::Boolean::New(env, sqlValue.getBoolean());

        case ES_STRING:
            printf("ES_STRING\n");
            return Napi::String::New(env, sqlValue.getString());

        case ES_NUMBER: {
            printf("ES_NUMBER\n");
            printf("@sqlToEsValue : Sql Type: %d\n", sqlType);
            switch (sqlType) {
                case NuoDB::NUOSQL_SMALLINT:
                    return Napi::Number::New(env, sqlValue.getShort());

                case NuoDB::NUOSQL_INTEGER:
                    return Napi::Number::New(env, sqlValue.getInt());

                case NuoDB::NUOSQL_DOUBLE:
                    return Napi::Number::New(env, sqlValue.getDouble());
            }
            return Napi::Number::New(env, sqlValue.getDouble());
        }

        case ES_NULL:
            printf("ES_NULL\n");
            return env.Null();

        case ES_UNDEFINED: {
            printf("ES_UNDEFINED\n");
            // check for types not directly supported in the ES type system...
            switch (sqlType) {
                case NuoDB::NUOSQL_BIGINT: {
                    int64_t v = sqlValue.getLong();
                    if (MIN_SAFE_INTEGER <= v && v <= MAX_SAFE_INTEGER) {
                        return Napi::Number::New(env, sqlValue.getLong());
                    } else {
                        return Napi::String::New(env, int64ToString(v));
                    }
                }
            }
        }
    }
    return env.Undefined();
}

Napi::Value ResultSet::getRowsAsJsValue(Napi::Env env)
{
    Napi::Array rows = Napi::Array::New(env);
    printf("---------------------------\n");
    printf("Rows Total: %zu\n", context.getRowsFetched());

    // must precalculate b/c we're popping later...
    size_t rowsTotal = context.getRowsFetched();

    for (size_t rowIdx = 0; rowIdx < rowsTotal; rowIdx++) {
        printf("Row: %zu\n", rowIdx);
        std::vector<SqlValue> sqlRow = context.popRow();
        if (context.getRowMode() == RowMode::ROWS_AS_OBJECT) {
            Napi::Object jsObject = Napi::Object::New(env);
            for (size_t colIdx = 0; colIdx < sqlRow.size(); colIdx++) {
                SqlValue sqlValue = sqlRow[colIdx];
                Napi::Value jsValue = sqlToEsValue(env, sqlValue);
                jsObject.Set(sqlValue.getName(), jsValue);
                printf("  Col Idx: %zu\n", colIdx);
                printf("  Col Val: %s\n", jsValue.ToString().Utf8Value().c_str());
            }
            rows.Set(rowIdx, jsObject);
        } else {
            Napi::Array jsArray = Napi::Array::New(env);
            for (size_t colIdx = 0; colIdx < sqlRow.size(); colIdx++) {
                SqlValue sqlValue = sqlRow[colIdx];
                Napi::Value jsValue = sqlToEsValue(env, sqlValue);
                jsArray.Set(colIdx, jsValue);
            }
            rows.Set(rowIdx, jsArray);
        }
    }
    return rows;
}

void ResultSet::doGetRows()
{
    if (!context.isStatementOpen()) {
        std::string message = ErrMsg::get(ErrMsgType::errNoStatement);
        throw std::runtime_error(message);
    }

    if (!context.isResultSetOpen()) {
        context.setResultSet(context.getStatement()->getResultSet());
        context.setIsResultSetOpen(true);
    }

    size_t rowsToFetch = context.getFetchSize();
    printf("ROWS TO FETCH: %zu\n", rowsToFetch);
    NuoDB::ResultSet* rs = context.getResultSet();
    NuoDB::ResultSetMetaData* metaData = rs->getMetaData();
    auto columns = metaData->getColumnCount();
    while (rowsToFetch > 0 && rs->next()) {
        std::vector<SqlValue> row;
        for (auto index = 0; index < columns; index++) {
            auto column = index + 1;
            int sqlType = metaData->getColumnType(column);

            SqlValue sqlValue;
            printf("column name: %s\n", metaData->getColumnName(column));
            sqlValue.setName(metaData->getColumnName(column));
            sqlValue.setSqlType(sqlType);

            printf("Sql Type: %d\n", sqlType);

            switch (sqlType) {
                case NuoDB::NUOSQL_SMALLINT:
                    printf("MATCHED SMALLINT\n");
                    sqlValue.setShort(rs->getShort(column));
                    break;

                case NuoDB::NUOSQL_INTEGER:
                    printf("MATCHED INTEGER\n");
                    sqlValue.setInt(rs->getInt(column));
                    break;

                case NuoDB::NUOSQL_BIGINT:
                    printf("MATCHED BIGINT\n");
                    sqlValue.setLong(rs->getLong(column));
                    break;

                case NuoDB::NUOSQL_FLOAT: // AN ALIAS FOR DOUBLE!!!
                case NuoDB::NUOSQL_DOUBLE:
                    printf("MATCHED DOUBLE\n");
                    sqlValue.setDouble(rs->getDouble(column));
                    break;

                case NuoDB::NUOSQL_BOOLEAN:
                    printf("MATCHED BOOLEAN\n");
                    sqlValue.setBoolean(rs->getBoolean(column));
                    break;

                case NuoDB::NUOSQL_CHAR:
                case NuoDB::NUOSQL_VARCHAR:
                case NuoDB::NUOSQL_LONGVARCHAR:
                    printf("MATCHED STRING\n");
                    sqlValue.setString(rs->getString(column));
                    break;

                default:
                    sqlValue.setString(rs->getString(column));
                    sqlValue.setSqlType(NuoDB::NUOSQL_VARCHAR);
            }
            // if the last value was null, set the value to null...
            if (rs->wasNull()) {
                sqlValue.setSqlType(NuoDB::NUOSQL_NULL);
            }
            row.push_back(sqlValue);
        }
        rowsToFetch++;
        context.pushRow(row);
        printf("ROWS BUFFERED: %zu\n", context.getRowsFetched());
    }
}

class RsCloseAsyncWorker : public Napi::AsyncWorker
{
public:
    RsCloseAsyncWorker(const Napi::Function& callback, ResultSet& target)
        : Napi::AsyncWorker(callback), target(target)
    {}

    ~RsCloseAsyncWorker()
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
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseResultSet, e.what());
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
    ResultSet& target;
};

Napi::Value ResultSet::close(const Napi::CallbackInfo& info)
{
    TRACE("ResultSet::close");

    Napi::Env env = info.Env();

    // Length is 1 only if this is called asynchronously.
    if (info.Length() == 1) {
        if (!info[0].IsFunction()) {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 0);
            Napi::TypeError::New(env, message).ThrowAsJavaScriptException();
            return info.Env().Undefined();
        }
        Napi::Function callback = info[0].As<Napi::Function>();

        RsCloseAsyncWorker* asyncWorker = new RsCloseAsyncWorker(callback, *this);
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
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseResultSet, e.what());
            deferred.Reject(Napi::Error::New(env, message).Value());
        }
        return deferred.Promise();
    } else {
        // silence bad warnings from gcc
        return info.Env().Undefined();
    }
}

void ResultSet::doClose()
{
    TRACE("ResultSet::doClose");
}
} // namespace NuoJs
