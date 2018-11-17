#ifndef NUOJS_RESULTSET_H
#define NUOJS_RESULTSET_H

#include "NuoJsAddon.h"
#include "NuoJsContext.h"

namespace NuoJs
{
class ResultSet : public Napi::ObjectWrap<ResultSet>
{
public:
    // Initialize the class system with resultset type info.
    static Napi::Object init(Napi::Env env, Napi::Object exports);

    // Constructs an object that wraps the value provided by the user.
    // The object returned from NewInstance is callback.info[0] passed
    // to the class constructor further below.
    static Napi::Value newInstance(Napi::Env env, const Context& c);

    // Constructs a resultset object from the value created in
    // NewInstance, above, which is in info[0].
    ResultSet(const Napi::CallbackInfo& info);
private:

    Napi::Value getRows(const Napi::CallbackInfo& info);

    // Release a database result set asynchronously.
    Napi::Value close(const Napi::CallbackInfo& info);

    void doClose();
    friend class RsCloseAsyncWorker;

    friend class GetRowsAsyncWorker;
    // Internal method to create row buffers from a result set.
    void doGetRows();
    // Internal method to convert row buffers to a Napi::Array.
    Napi::Value getRowsAsJsValue(Napi::Env env);

    static Napi::FunctionReference constructor;

    Napi::ObjectReference refConnection;

    Context context;
};
} // namespace NuoJs

#endif
