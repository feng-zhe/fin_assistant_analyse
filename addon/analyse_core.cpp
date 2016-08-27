#include <node.h>
#include <iostream>

namespace AnalyseCore{

    using namespace v8;

    void PF_max_var(const FunctionCallbackInfo<Value>& args) {
        // log
        std::cout<<"[info] Start C++ function PF_max_var"<<std::endl;

        // create v8::Isolate
        Isolate* isolate = args.GetIsolate();
        Local<Array> array = Array::New(isolate,2);

        if(args.Length()==2&&args[0]->IsArray()&&args[1]->IsArray()){
            Local<Array> a1 = Local<Array>::Cast(args[0]);
            Local<Array> a2 = Local<Array>::Cast(args[1]);
            Local<Array> a21 = Local<Array>::Cast(a2->Get(0));
            array->Set(0,Local<Number>::Cast(a1->Get(0)));
            array->Set(1,Local<Number>::Cast(a21->Get(0)));
        }

        // Return an empty result if there was an error creating the array.
        if (array.IsEmpty())
            return;

        // return the array
        args.GetReturnValue().Set(array);

        // log
        std::cout<<"[info] Exiting C++ function PF_max_var"<<std::endl;
    }

    void init(Local<Object> exports) {
        NODE_SET_METHOD(exports, "pf_max_var", PF_max_var);
    }

    NODE_MODULE(addon, init)

}  // namespace AnalyseCore
