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
            context.setRowMode(toRowMode(rowMode.ToNumber().Int32Value()));
        } else {
            std::string message = ErrMsg::get(ErrMsgType::errInvalidPropertyType, "rowMode");
            throw std::runtime_error(message);
        }
    }
}
}
