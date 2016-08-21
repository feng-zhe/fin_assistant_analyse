'use strict';

const fs = require('fs');
const jStat = require('jStat').jStat;
const constants = require('../constants');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const centName = constants.collection_name_center;
const MongoClient = require('mongodb').MongoClient;
const timeGap = 180 * 24 * 60 * 60 * 1000; // TODO:currently it will consider the data in recent 180 days

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
                                    ExpectedReturn: expret,
                                    StandardDeviation: stdev
                                });
                            }
                            // calculation for covariance between two stocks
                            for (let i = 0; i < values.length - 1; ++i) {
                                const returns1 = getReturns(values[i]);
                                const symbol1 = returns1[0].symbol;
                                for (let j = i + 1; j < values.length; ++j) {
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
                                            sum += (return1.returns - indv.get(symbol1).ExpectedReturn) *
                                                (return2.returns - indv.get(symbol2).ExpectedReturn);
                                            count++;
                                        }
                                    }
                                    // record resuls
                                    if (dual[symbol1] === undefined) dual[symbol1] = [];
                                    if (dual[symbol2] === undefined) dual[symbol2] = [];
                                    dual[symbol1][symbol2] = dual[symbol2][symbol1] = sum / count;
                                }
                            }
                            // TODO: now let's calculate the ideal portfolio
                            db.close();
                        }, function(err) {
                            throw err;
                        });
                    });
            } catch (err) {
                reject(err);
                db.close();
            }
        });
    });
}
