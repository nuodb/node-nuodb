// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#include "NuoJsResultSet.h"
#include "NuoJsErrMsg.h"
#include "NuoJsValue.h"
#include "NuoJsTypes.h"
#include "NuoJsNan.h"
#include "NuoJsNanDate.h"
#include "NuoDB.h"

namespace NuoJs
{
Nan::Persistent<Function> ResultSet::constructor;

ResultSet::ResultSet()
    : Nan::ObjectWrap(), statement(nullptr), result(nullptr)
{
    TRACE("ResultSet::ResultSet");
}

/* virtual */
ResultSet::~ResultSet()
{
    TRACE("ResultSet::~ResultSet");
}

/* static */
NAN_MODULE_INIT(ResultSet::init)
{
    TRACE("ResultSet::init");
    Nan::HandleScope scope;

    // prepare constructor template...
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(ResultSet::newInstance);
    tpl->SetClassName(Nan::New("ResultSet").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // prototypes...
    Nan::SetPrototypeMethod(tpl, "getRows", getRows);
    Nan::SetPrototypeMethod(tpl, "close", close);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New<v8::String>("ResultSet").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

/* static */
NAN_METHOD(ResultSet::newInstance)
{
    TRACE("ResultSet::newInstance");
    Nan::HandleScope scope;
    if (info.IsConstructCall()) {
        ResultSet* obj = new ResultSet();
        obj->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    } else {
        Local<Function> cons = Nan::New<Function>(constructor);
        info.GetReturnValue().Set(Nan::NewInstance(cons).ToLocalChecked());
    }
}

/* static */
Local<Object> ResultSet::createFrom(class NuoDB::Statement* statement, Options options)
{
    TRACE("ResultSet::createFrom");
    Nan::EscapableHandleScope scope;
    Local<Function> cons = Nan::New<Function>(ResultSet::constructor);
    Local<Object> obj = Nan::NewInstance(cons).ToLocalChecked();
    ResultSet* self = Nan::ObjectWrap::Unwrap<ResultSet>(obj);
    self->statement = statement;
    self->options = options;
    return scope.Escape(obj);
}

class ResultSetCloseWorker : public Nan::AsyncWorker
{
public:
    ResultSetCloseWorker(Nan::Callback* callback, ResultSet* self)
        : Nan::AsyncWorker(callback), self(self)
    {
        TRACE("ResultSetCloseWorker::ResultSetCloseWorker");
    }

    virtual ~ResultSetCloseWorker()
    {
        TRACE("ResultSetCloseWorker::~ResultSetCloseWorker");
    }

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    virtual void Execute()
    {
        TRACE("ResultSetCloseWorker::Execute");
        try {
            self->doClose();
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errFailedCloseResultSet, e.what());
            SetErrorMessage(message.c_str());
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    virtual void HandleOKCallback()
    {
        TRACE("ResultSetCloseWorker::OnOK");
        Nan::HandleScope scope;
        Local<Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    }

private:
    ResultSet* self;
};

/* static */
NAN_METHOD(ResultSet::close)
{
    TRACE("ResultSet::close");
    Nan::HandleScope scope;

    ResultSet* self = Nan::ObjectWrap::Unwrap<ResultSet>(info.This());

    if (!info.Length() || !info[(info.Length() - 1)]->IsFunction()) {
        Nan::ThrowError("connect arg count zero, or last arg is not a function");
        return;
    }
    Nan::Callback* callback = new Nan::Callback(info[0].As<Function>());

    ResultSetCloseWorker* worker = new ResultSetCloseWorker(callback, self);
    worker->SaveToPersistent("nuodb:ResultSet", info.This());
    Nan::AsyncQueueWorker(worker);
}

void ResultSet::doClose()
{
    TRACE("ResultSet::doClose");
    if (result) {
        result->close();
        result = nullptr;
    }
    if (statement) {
        statement->close();
        statement = nullptr;
    }
}

class GetRowsWorker : public Nan::AsyncWorker
{
public:
    GetRowsWorker(Nan::Callback* callback, ResultSet* self, size_t count)
        : Nan::AsyncWorker(callback), self(self), count(count)
    {
        TRACE("GetRowsWorker::GetRowsWorker");
    }

    virtual ~GetRowsWorker()
    {
        TRACE("GetRowsWorker::~GetRowsWorker");
    }

    /**
     * Executes on the worker thread.
     * It is unsafe to access JS engine data structures on worker threads.
     * All input and output MUST occur on this->.
     */
    virtual void Execute()
    {
        TRACE("GetRowsWorker::Execute");
        try {
            self->doGetRows(count);
        } catch (std::exception& e) {
            std::string message = ErrMsg::get(ErrMsgType::errGetRows, e.what());
            SetErrorMessage(message.c_str());
        }
    }

    /**
     * Executes on the main event loop, so it's safe to access JS engine data
     * structures. Called when async work is complete.
     */
    virtual void HandleOKCallback()
    {
        TRACE("GetRowsWorker::HandleOKCallback");
        Nan::HandleScope scope;
        Local<Value> rows = self->getRowsAsJsValue();
        Local<Value> argv[] = {
            Nan::Null(),
            rows
        };
        callback->Call(2, argv, async_resource);
    }

private:
    ResultSet* self;
    size_t count;
};

/**
 * getRows is used to retrieve rows from the result set.
 *
 * getRows can have two or fewer parameters.
 *
 * (optional) Number :      an integer indicating the count of rows to be
 *                          returned. If unspecified, the method returns all
 *                          rows. This must be the first parameter.
 *                          Negative zero (0) is a sentinel value that means
 *                          "all".
 * (optional) Function :    an error-first callback if this method is called
 *                          asynchronously; if omitted, then a promise is
 *                          returned.
 */
NAN_METHOD(ResultSet::getRows)
{
    TRACE("ResultSet::getRows");
    Nan::HandleScope scope;

    ResultSet* self = Nan::ObjectWrap::Unwrap<ResultSet>(info.This());

    auto infoIdx = 0;
    auto infoLen = info.Length();
    size_t rowsToRead = 0;
    if (infoLen > 0 && info[infoIdx]->IsInt32()) {
        rowsToRead = (size_t)toInt32(info[infoIdx++]);
    }

    if (!info[infoIdx]->IsFunction()) {
        std::string message = ErrMsg::get(ErrMsgType::errInvalidParamType, 1);
        Nan::ThrowError(Nan::New<String>(message).ToLocalChecked());
        return;
    }
    Nan::Callback* callback = new Nan::Callback(info[infoIdx].As<Function>());

    GetRowsWorker* worker = new GetRowsWorker(callback, self, rowsToRead);
    worker->SaveToPersistent("nuodb:ResultSet", info.This());
    Nan::AsyncQueueWorker(worker);
}

static Local<Function> dateConstructor = Local<Function>::Cast(
    Nan::Get(Nan::New<v8::Date>(0).ToLocalChecked(),
             Nan::New("constructor").ToLocalChecked()).ToLocalChecked());

Local<Value> sqlToEsValue(SqlValue sqlValue)
{
    TRACE("ResultSet::sqlToEsValue");
    Nan::EscapableHandleScope scope;

    int sqlType = sqlValue.getSqlType();
    int esType = Type::toEsType(sqlType);
    switch (esType) {
        case ES_BOOLEAN:
            return scope.Escape(Nan::New<Boolean>(sqlValue.getBoolean()));

        case ES_STRING:
            return scope.Escape(Nan::New<String>(sqlValue.getString()).ToLocalChecked());

        case ES_NUMBER: {
            switch (sqlType) {
                case NuoDB::NUOSQL_SMALLINT:
                    return scope.Escape(Nan::New<Number>(sqlValue.getShort()));

                case NuoDB::NUOSQL_INTEGER:
                    return scope.Escape(Nan::New<Number>(sqlValue.getInt()));

                case NuoDB::NUOSQL_DOUBLE:
                    return scope.Escape(Nan::New<Number>(sqlValue.getDouble()));
            }
            return scope.Escape(Nan::New<Number>(sqlValue.getDouble()));
        }

        case ES_NULL:
            return scope.Escape(Nan::Null());

        case ES_DATE: {
            switch (sqlType) {

                // See: https://stackoverflow.com/questions/34158318/are-there-some-v8-functions-to-create-a-c-v8date-object-from-a-string-like

                case NuoDB::NUOSQL_TIME: {
                    // Hackish, but ES doesn't actually support TIME
                    return scope.Escape(NanDate::toDate(std::string("1970-01-01T") + sqlValue.getString()));
                }

                case NuoDB::NUOSQL_DATE:
                case NuoDB::NUOSQL_TIMESTAMP: {
                    return scope.Escape(NanDate::toDate(sqlValue.getString()));
                }
                default: 
                    throw std::runtime_error("ES DATE type is unknown NUOSQL type");
                    break;
            }
        }

        case ES_UNDEFINED: {
            // check for types not directly supported in the ES type system...
            switch (sqlType) {
                case NuoDB::NUOSQL_BIGINT: {
                    int64_t v = sqlValue.getLong();
                    if (MIN_SAFE_INTEGER <= v && v <= MAX_SAFE_INTEGER) {
                        return scope.Escape(Nan::New<Number>(sqlValue.getLong()));
                    } else {
                        return scope.Escape(Nan::New<String>(int64ToString(v).c_str()).ToLocalChecked());
                    }
                }
            }
        }
    }
    TRACE("sqlToEsValue : RETURNING UNDEFINED");
    return scope.Escape(Nan::Undefined());
}

Local<Value> ResultSet::getRowsAsJsValue()
{
    TRACE("ResultSet::getRowsAsJsValue");
    Nan::EscapableHandleScope scope;
    Isolate* isolate = Isolate::GetCurrent();
    Local<Context> ctx = isolate->GetCurrentContext();

    size_t count = rows.size();
    Local<Array> array = Nan::New<Array>(count);
    for (size_t rowIdx = 0; rowIdx < count; rowIdx++) {
        std::vector<SqlValue> sqlRow = rows.front();
        rows.pop_front();
        if (options.getRowMode() == RowMode::ROWS_AS_OBJECT) {
            Local<Object> jsObject = Nan::New<Object>();
            for (size_t colIdx = 0; colIdx < sqlRow.size(); colIdx++) {
                SqlValue sqlValue = sqlRow[colIdx];
                Local<Value> jsKey = Nan::New<String>(sqlValue.getName()).ToLocalChecked();
                TRACE("Object << sqlToEsValue");
                Local<Value> jsValue = sqlToEsValue(sqlValue);
                jsObject->Set(ctx, jsKey, jsValue).Check();
                TRACE("Object >> sqlToEsValue");
            }
            array->Set(ctx, rowIdx, jsObject).Check();
        } else {
            Local<Array> jsArray = Nan::New<Array>();
            for (size_t colIdx = 0; colIdx < sqlRow.size(); colIdx++) {
                SqlValue sqlValue = sqlRow[colIdx];
                TRACE("Array << sqlToEsValue");
                Local<Value> jsValue = sqlToEsValue(sqlValue);
                TRACE("Array >> sqlToEsValue");
                jsArray->Set(ctx, colIdx, jsValue).Check();
            }
            array->Set(ctx, rowIdx, jsArray).Check();
        }
    }
    return scope.Escape(array);
}

bool ResultSet::isStatementOpen() const
{
    return statement != nullptr;
}

bool ResultSet::isResultOpen() const
{
    return result != nullptr;
}

void ResultSet::doGetRows(size_t count)
{
    TRACE("ResultSet::doGetRows");

    if (!isStatementOpen()) {
        std::string message = ErrMsg::get(ErrMsgType::errNoStatement);
        throw std::runtime_error(message);
    }

    if (!isResultOpen()) {
        result = statement->getResultSet();
    }

    if(result == nullptr){
        // if the result set is still null at this point, there is the potential that one connection is being used for multiple queries.
        throw std::runtime_error("Cannot access result set. Please ensure there is only one actively executing query per connection.");
    }

    bool fetchAll = count == 0;
    NuoDB::ResultSetMetaData* metaData = result->getMetaData();
    auto columns = metaData->getColumnCount();
    while ((fetchAll || count > 0) && result->next()) {
        TRACE("HANDLE ROW...");
        std::vector<SqlValue> row;
        for (auto index = 0; index < columns; index++) {
            auto column = index + 1;
            int sqlType = metaData->getColumnType(column);

            SqlValue sqlValue;
            sqlValue.setName(metaData->getColumnLabel(column));
            sqlValue.setTable(metaData->getTableName(column));
            sqlValue.setSqlType(sqlType);

            switch (sqlType) {
                case NuoDB::NUOSQL_SMALLINT:
                    sqlValue.setShort(result->getShort(column));
                    break;

                case NuoDB::NUOSQL_INTEGER:
                    sqlValue.setInt(result->getInt(column));
                    break;

                case NuoDB::NUOSQL_BIGINT:
                    sqlValue.setLong(result->getLong(column));
                    break;

                case NuoDB::NUOSQL_FLOAT: // AN ALIAS FOR DOUBLE!!!
                case NuoDB::NUOSQL_DOUBLE:
                    sqlValue.setDouble(result->getDouble(column));
                    break;

                case NuoDB::NUOSQL_BOOLEAN:
                    sqlValue.setBoolean(result->getBoolean(column));
                    break;

                case NuoDB::NUOSQL_DATE:
                case NuoDB::NUOSQL_TIME:
                case NuoDB::NUOSQL_TIMESTAMP:
                case NuoDB::NUOSQL_CHAR:
                case NuoDB::NUOSQL_VARCHAR:
                case NuoDB::NUOSQL_LONGVARCHAR: {
                    const char* s = result->getString(column);
                    if (!result->wasNull()) {
                        sqlValue.setString(s);
                    }
                    break;
                }

                default:
                    const char* s = result->getString(column);
                    if (!result->wasNull()) {
                        sqlValue.setString(s);
                        sqlValue.setSqlType(NuoDB::NUOSQL_VARCHAR);
                    }
                    break;
            }
            // if the last value was null, set the value to null...
            if (result->wasNull()) {
                sqlValue.setSqlType(NuoDB::NUOSQL_NULL);
            }
            row.push_back(sqlValue);
        }
        count--;
        rows.push_back(row);
    }
}
} // namespace NuoJs
