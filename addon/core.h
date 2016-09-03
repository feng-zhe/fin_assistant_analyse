/*
 * This file contains the main analyse functions
 */
#include <vector>
#include <map>

namespace Core {

    using namespace std;
    using uint = unsigned int;

    const int expStep = 1; // currently is daily expectation
    const double tryStep = 0.03; // the step when trying the portfolio

    class IterCalc {
        public:
            IterCalc(const vector<double> &allExpt, const vector<vector<double>> &allCov, const double maxVar)
                : m_allExpt(allExpt),
                  m_allCov(allCov), 
                  m_maxVar(maxVar),  
                  m_currWeights(m_allCov.size(), 0),
                  m_idealWeights(m_allCov.size(), 0)
            { }

            // the main function
            vector<double> calc(){
                calc_helper(0, 1.0);
                return m_idealWeights;
            }
        private:
            void calc_helper(uint index, double restWeights){
                if(index == m_currWeights.size()-1 ){ // this is the last one
                    m_currWeights[index] = restWeights;
                    calc_curr();
                    m_currWeights[index] = 0;
                }
                else{
                    for(double weight = 0; weight<=restWeights; weight += tryStep){
                        m_currWeights[index] = weight;
                        calc_helper(index+1, restWeights - weight);
                        m_currWeights[index] = 0;
                    }
                }
            }

            void calc_curr(){
                double pVar = 0;
                const uint nSize = m_currWeights.size();
                // calculate the portfolio variance
                for(uint i = 0; i< nSize; i++){
                    for(uint j =0; j< nSize; j++){
                        pVar += m_currWeights[i]*m_currWeights[j]*m_allCov[i][j];
                    }
                }
                if(pVar > m_maxVar){ // don't meet the max variance requirement, quit
                    return;
                }
                // calculate the return
                double pRet = 0;
                for(uint i=0; i<nSize; i++){
                    pRet += m_currWeights[i]*m_allExpt[i];
                }
                // update the ideal portfolio
                if(pRet > m_idealRet){
                    m_idealRet = pRet;
                    m_idealVar = pVar;
                    m_idealWeights = m_currWeights;
                }
            }
        private:
            const vector<double> &m_allExpt;
            const vector<vector<double>> &m_allCov;
            const double m_maxVar;
            vector<double> m_currWeights;
            vector<double> m_idealWeights;
            double m_idealVar;
            double m_idealRet;
    };

    /*
     * find the ideal portfolio under the maxium variance limitation
     */
    vector<double> PF_max_var(vector<vector<double>> &allRecords, const double maxVar){
        // calculate the returns
        vector<vector<double>> allReturns; // percentage of increase
        for(auto records : allRecords){
            vector<double> returns(records.size());
            for(uint i=0; i<records.size()-1; ++i){
                returns.push_back((records[i+1] - records[i])/records[i]);
            }
            allReturns.push_back(returns);
        }
        // calculate the expectation
        vector<double> allExpt; // expectation
        for(auto returns : allReturns){
            map<double,double> tmap;
            double exp = 0;
            for(auto val : returns){
                tmap[val]++;
            }
            const unsigned int size = returns.size();
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
        // calculate the covariance
        const unsigned int aretn = allReturns.size();
        vector<vector<double>> allCov(aretn, vector<double>(aretn,0)); // covariance, 2 dimension matrix
        for(uint i=0; i<aretn; i++){
            for(uint j=i; j<aretn; j++){
                const vector<double> &irets = allReturns[i];
                const vector<double> &jrets = allReturns[j];
                double cov = 0;
                for(uint k=0; k<aretn; k++){
                    cov += (irets[k]-allExpt[i])*(jrets[k]-allExpt[j]);
                }
                cov /= aretn;
                allCov[i][j] = allCov[j][i] = cov;
            }
        }
        // find the ideal portfolio and return
        IterCalc calc(allExpt, allCov, maxVar);
        return calc.calc();
    }

}
