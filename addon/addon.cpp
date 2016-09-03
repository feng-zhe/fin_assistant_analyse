#include <node.h>
#include <iostream>
#include <vector>
#include "core.h"

namespace Addon {

    using namespace v8;

    void PF_max_var(const FunctionCallbackInfo<Value>& args) {
        // log
        std::cout<<"[info] Start C++ function PF_max_var"<<std::endl;

        // create v8::Isolate
        Isolate* isolate = args.GetIsolate();
        Local<Array> result;

        if(args.Length()==2&&args[0]->IsArray()&&args[1]->IsNumber()){ // the args[0] is like [[1,2,3],[1.1,2.2,3.3]]
            Local<Array> input = Local<Array>::Cast(args[0]);
            Local<Number> maxVar = Local<Number>::Cast(args[1]);
            // convert data into STL vector
            std::vector<std::vector<double>> data;
            for(unsigned int i=0; i< input->Length(); ++i){
                Local<Array> records = Local<Array>::Cast(input->Get(i)); // the records are [1,2,3]
                std::vector<double> vec;
                for(unsigned int j=0; j< records->Length(); ++j){
                    Local<Number> num = Local<Number>::Cast(records->Get(j));
                    vec.push_back(num->Value());
                }
                data.push_back(vec);
            }
            // use core function to calculate
            auto weights = Core::PF_max_var(data,maxVar->Value());
            // convert the result to v8 array
            result = Array::New(isolate, weights.size());
            for(unsigned int i=0; i < weights.size(); i++){
                result->Set(i, Number::New(isolate, weights[i]));
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
