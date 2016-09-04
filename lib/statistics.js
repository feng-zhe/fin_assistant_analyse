'use strict';

const fs = require('fs');
const constants = require('../constants');
const analyseCore = require('bindings')('analyse_core');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const centName = constants.collection_name_center;
const aretName = constants.collection_name_analyse_result;
const MongoClient = require('mongodb').MongoClient;
const timeGap = 180 * 24 * 60 * 60 * 1000; // TODO:currently it will consider the data in recent 180 days
const maxVar = 0.1; // TODO: currently fix the max variance

var nStockLimit = 5;
if (process.env.NODE_ENV === 'production') {
    nStockLimit = 10;
}

// exports
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
                        }, {
                            $limit: nStockLimit
                        }])
                    .toArray(function(err, stocks) {
                        if (err) throw err;
                        console.log('[info]', 'considering ' + stocks.length + ' stocks.', 'the limit is ' + nStockLimit);
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
                        Promise.all(promises).then(function(values) {
                            console.log('[info]', 'calling c++ addon "analyse_core" from Nodejs');
                            // prepare the data for C++ addon
                            const cdata = [];
                            for (const records of values) {
                                cdata.push(records.map(function(obj) {
                                    return obj.Close;
                                }));
                            }
                            // call the C++ addon
                            const cres = analyseCore.pf_max_var(cdata, maxVar);
                            console.log('[info]', 'return to Nodejs from c++ addon "analyse_core"');
                            console.log('[info]', 'result is ' + cres);
                            resolve();
                            db.close();
                        }).catch(function(err) {
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
