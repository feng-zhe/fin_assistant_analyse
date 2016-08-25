'use strict';

const fs = require('fs');
const jStat = require('jStat').jStat;
const constants = require('../constants');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const centName = constants.collection_name_center;
const aretName = constants.collection_name_analyse_result;
const MongoClient = require('mongodb').MongoClient;
const timeGap = 180 * 24 * 60 * 60 * 1000; // TODO:currently it will consider the data in recent 180 days
const doubleGap = 0.0000001;
const weightStep = 0.05;
const stockLimits = 11;

const stat = module.exports;

stat.calcPortfolio = function() {
    return new Promise(function(resolve, reject) {
        // get the stock list
        MongoClient.connect(config.dbUri, function(err, db) {
            try {
                if (err) throw err;
                db.collection(centName)
                    .aggregate(
                        [{
                            $group: {
                                _id: '$Symbol'
                            }
                        }]
                    )
                    .toArray(function(err, stocks) {
                        if (err) throw err;
                        // calculate the expected return and standard sample variance for every stock
                        const promises = [];
                        for (const stock of stocks) {
                            // find records of this stock
                            const promise = db.collection(centName)
                                .find({
                                    Symbol: stock._id,
                                    Date: {
                                        $gt: new Date((new Date()) - timeGap)
                                    }
                                })
                                .sort({
                                    Date: 1
                                })
                                .toArray();
                            promises.push(promise);
                        }
                        Promise.all(promises).then(function(values) { // the values is an array of arrays of records
                            const indv = new Map(); // information about individual stocks
                            const dual = []; // information between two stocks
                            function getReturns(records) {
                                // TODO: currently use the day's close time to calculate the return, then use average to find the expected return
                                const returns = [];
                                for (let i = 1; i < records.length; ++i) {
                                    returns.push({
                                        symbol: records[i].Symbol,
                                        Date: records[i].Date,
                                        returns: (records[i].Close - records[i - 1].Close) / records[i - 1].Close
                                    });
                                }
                                return returns;
                            }
                            // calculation for individual stocks
                            for (const records of values) { // the records is the records of one stock
                                if (records.length === 0) {
                                    break;
                                }
                                const returns = getReturns(records).map(obj => obj.returns);
                                const symbol = records[0].Symbol;
                                const expret = jStat.mean(returns); // the expected return
                                const stdev = jStat.stdev(returns, true); // standard deviation
                                // record results
                                indv.set(symbol, {
                                    expectedReturn: expret,
                                    standardDeviation: stdev
                                });
                            }
                            // calculation for covariance between two stocks
                            for (let i = 0; i < values.length - 1; ++i) {
                                const returns1 = getReturns(values[i]);
                                const symbol1 = returns1[0].symbol;
                                for (let j = i; j < values.length; ++j) {
                                    const returns2 = getReturns(values[j]);
                                    const symbol2 = returns2[0].symbol;
                                    let count = 0,
                                        sum = 0;
                                    // create the map (date,record) for the other stock
                                    const r2map = new Map();
                                    for (const return2 of returns2) {
                                        r2map.set(return2.Date.getTime(), return2);
                                    }
                                    // sum the (Ri-ERi)(Rj-ERj)
                                    for (const return1 of returns1) {
                                        // find the same date record in the other stock
                                        const return2 = r2map.get(return1.Date.getTime());
                                        if (return2 !== undefined) {
                                            sum += (return1.returns - indv.get(symbol1).expectedReturn) *
                                                (return2.returns - indv.get(symbol2).expectedReturn);
                                            count++;
                                        }
                                    }
                                    // record resuls
                                    if (dual[symbol1] === undefined) dual[symbol1] = [];
                                    if (dual[symbol2] === undefined) dual[symbol2] = [];
                                    dual[symbol1][symbol2] = dual[symbol2][symbol1] = sum / count;
                                }
                            }
                            // now let's calculate the ideal portfolio
                            const symbols = [];
                            // check whether it reaches the limits
                            let added = 0;
                            for (const symbol of indv.keys()) {
                                symbols.push(symbol);
                                if (++added === stockLimits) {
                                    console.log('[warning]','the number of stock added reaches the limit '+stockLimits);
                                    break;
                                }
                            }
                            // store the result into database
                            const idealPrtf = fixedMaxVariance(symbols, 0.10, indv, dual);
                            db.collection(aretName).drop(function(err, result) {
                                // transform the map object because it will cause the mongodb error
                                const temp = [];
                                for (const key of idealPrtf.weights.keys()) {
                                    temp.push([key, idealPrtf.weights.get(key)]);
                                }
                                idealPrtf.weights = temp;
                                db.collection(aretName)
                                    .insertOne(idealPrtf, function(err, result) {
                                        if (err) throw err;
                                        resolve();
                                        db.close();
                                    })
                            });
                        })
                        .catch(function(err) {
                            // be careful here because the 'throw err' in promise 'then' and 'catch' wouldn't spread out under node 4.4.7
                            reject(err);
                            db.close();
                        });
                    });
            } catch (err) {
                reject(err);
                db.close();
            }
        });
    });
}

/* get the portfolio with max expected return undert fixed max variance
 * indv: a map contains expectedReturn and variance of a single stock
 * covMatrix: a map contains covariance
 */
function fixedMaxVariance(symbols, maxVar, indv, covMatrix) {
    function calcExpectReturn() {
        let result = 0;
        for (const symbol of symbols) {
            result += weights.get(symbol) * indv.get(symbol).expectedReturn;
        }
        return result;
    }

    function calcProtfolioVariance() {
        let result = 0;
        for (const symbol1 of symbols) {
            for (const symbol2 of symbols) {
                result += weights.get(symbol1) *
                    weights.get(symbol2) *
                    covMatrix[symbol1][symbol2];
            }
        }
        return result;
    }

    // 'rest' is the rest weights this function can use
    function helper(index, rest) {
        const symbol = symbols[index];
        if (index === symbols.length || rest <= doubleGap) { // the weight is set ready
            const expRet = calcExpectReturn();
            const variance = calcProtfolioVariance();
            if (variance > maxVar) return; // exceed the max variance requirement
            if (result.expectedReturn === undefined) { // result is not set
                result.expectedReturn = expRet;
                result.variance = variance;
                result.weights = new Map();
                for (const key of weights.keys()) {
                    result.weights.set(key, weights.get(key));
                }
            } else { // there is a result, we have to compare the expected return
                if (result.expectedReturn <= expRet) {
                    result.expectedReturn = expRet;
                    result.variance = variance;
                    result.weights = new Map();
                    for (const key of weights.keys()) {
                        result.weights.set(key, weights.get(key));
                    }
                }
            }
            return;
        } else if (index === symbols.length - 1) {
            weights.set(symbol, rest);
            helper(index + 1, 0);
            weights.set(symbol, 0); // clear this iterate for next time
        } else {
            for (let x = 0; x <= rest; x += weightStep) {
                weights.set(symbol, x);
                helper(index + 1, rest - x);
            }
            weights.set(symbol, 0); // clear this iterate for next time
        }
    }

    let result = {};
    let weights = new Map();
    for (const symbol of symbols) {
        weights.set(symbol, 0);
    }
    helper(0, 1);
    return result;
}
