'use strict';

const analyseCore = require('bindings')('analyse_core');

console.log(analyseCore.pf_max_var([0,3,9],[[100,101,102]]));
