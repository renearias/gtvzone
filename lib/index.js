'use strict';
var $ = require('jquery');
var gtvcore=require('./gtv/gtvcore')($);
require('./gtv/keycontrol')(gtvcore);
require('./gtv/sidenav')(gtvcore);
module.exports = gtvcore;
