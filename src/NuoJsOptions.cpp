#include "NuoJsOptions.h"
#include "NuoJsRowMode.h"
#include "NuoJsContext.h"
#include "NuoJsErrMsg.h"
#include "NuoJsJson.h"
#include <stdio.h>

namespace NuoJs
{

RowMode toRowMode(uint32_t value)
{
    return (value == ROWS_AS_OBJECT) ? ROWS_AS_OBJECT : ROWS_AS_ARRAY;
}

void getJsonOptions(Napi::Env env, Napi::Object object, Context& context)
{
    if (object.Has("rowMode")) {
        Napi::Value rowMode = getJsonNumber(env, object, "rowMode");
        if (rowMode.IsNumber()) {
            int32_t mode = rowMode.ToNumber().Int32Value();
            if (mode != ROWS_AS_ARRAY && mode != ROWS_AS_OBJECT) {
                std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyValue, "rowMode");
                throw std::runtime_error(message);
            }
            context.setRowMode(toRowMode(mode));
        } else {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, "rowMode");
            throw std::runtime_error(message);
        }
    }
    if (object.Has("fetchSize")) {
        Napi::Value fetchSize = getJsonNumber(env, object, "fetchSize");
        if (fetchSize.IsNumber()) {
            int32_t size = fetchSize.ToNumber().Int32Value();
            if (size < 0) {
                std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyValue, "fetchSize");
                throw std::runtime_error(message);
            }
            context.setFetchSize(size);
        } else {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, "fetchSize");
            throw std::runtime_error(message);
        }
    }
    if (object.Has("autoCommit")) {
        Napi::Value autoCommit = getJsonBoolean(env, object, "autoCommit");
        if (autoCommit.IsBoolean()) {
            context.setAutoCommit(toRowMode(autoCommit.ToBoolean()));
        } else {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, "autoCommit");
            throw std::runtime_error(message);
        }
    }
}
}
