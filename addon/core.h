/*
 * This file contains the main analyse functions
 */
#include <vector>
#include <map>

using namespace std;

namespace Core {
    /*
     * find the ideal portfolio under the maxium variance limitation
     */
    vector<double> PF_max_var(vector<vector<double>> &allRecords){
        vector<double> result;
        vector<vector<double>> allReturns;
        vector<double> allExpt; // expectation
        vector<double> allDevs; // deviations
        // calculate the returns
        for(auto records : allRecords){
            vector<double> returns(records.size());
            for(int i=0; i<records.size()-1; ++i){
                 returns.push_back((records[i+1] - records[i])/records[i]);
            }
            allReturns.push_back(returns);
        }
        // calculate the expectation
        for(auto returns : allReturns){
            map<double,int> tmap;
            double exp = 0;
            for(auto val : returns){
                tmap[val]++;
            }
            const int size = returns.size();
            for(auto pair: tmap){
                tmap[pair.first] = tmap[pair.first]/size; // the possibility
            }
            // calculate the expectation
            exp = 0;
            for(auto pair: tmap){
                exp += pair.first*tmap[pair.first];
            }
            // store the expectation
            allExpt.push_back(exp);
        }
        // calculate the deviation
        // calculate the covariance
        // find the ideal portfolio
        return result;
    }
}
