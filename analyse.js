'use strict';

const stat = require('./lib/statistics.js');

stat.calcPortfolio()
    .then(function() {
        console.log('[info]', 'portfolio calculation done');
    })
    .catch(function(err) {
        console.log('[error]', 'portfolio calculation failure, error: ' + err);
    });
