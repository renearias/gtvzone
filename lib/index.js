'use strict';
var gtvcore=require('./gtv/gtvcore');
var control=require('./gtv/keycontrol')(gtvcore);
var sidenav=require('./gtv/sidenav')(gtvcore);
module.exports = gtvcore;
