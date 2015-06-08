'use strict';

var fs = require('fs')
var path = require('path')
var which = require('which')

var version = '0.5.3';
var architecture = (process.arch === 'x64') ? 'amd64' : '386';

function platform(){
    if (process.platform === 'linux') {
        return 'linux';
    } else if (process.platform === 'darwin' ){
        return 'darwin';
    } else if (process.platform === 'openbsd' ){
        return 'openbsd';
    } else if (process.platform === 'freebsd') {
        return 'freebsd';
    } else if (process.platform === 'win32') {
        return 'windows';
    }
}

function downloadUri(cdn){
    var download = cdn.replace(/\/$/, '') + '/';
    return download + filename();
}

function filename(cdn) {
    var name = ['terraform'];
    name.push(version);
    name.push(platform());
    name.push(architecture);
    return  name.join('_') + '.zip';
}

module.exports = {
    architecture: architecture,
    downloadUri: downloadUri,
    filename: filename,
    platform: platform,
    version: version
}
