#include <node.h>
#include <v8.h>
#include <iostream>

namespace Addon {

    using namespace v8;

    void PF_max_var(const FunctionCallbackInfo<Value>& args) {
        // log
        std::cout<<"[info] Start C++ function PF_max_var"<<std::endl;

        // create v8::Isolate
        Isolate* isolate = args.GetIsolate();
        Local<Array> result;

        if(args.Length()==1&&args[0]->IsArray()){ // the args[0] is like [[1,2,3],[1.1,2.2,3.3]]
            Local<Array> input = Local<Array>::Cast(args[0]);
            result = Array::New(isolate,input->Length());
            for(unsigned int i=0; i<input->Length();++i){
                Local<Array> records = Local<Array>::Cast(input->Get(i)); // the records are [1,2,3]
                std::cout<<"C++ addon is dealing "<<records->Length()<<" records"<<std::endl;
            }
        }

        // return the array
        args.GetReturnValue().Set(result);

        // log
        std::cout<<"[info] Exiting C++ function PF_max_var"<<std::endl;
    }

    void init(Local<Object> exports) {
        NODE_SET_METHOD(exports, "pf_max_var", PF_max_var);
    }

    NODE_MODULE(addon, init)

}  // namespace
