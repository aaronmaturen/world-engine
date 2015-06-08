'use strict';

var AdmZip = require('adm-zip'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    progress = require('progress'),
    request = require('request'),
    requestProgress = require('request-progress'),
    rimraf = require('rimraf'),
    which = require('which');

var helper = require('./lib/environment');

var cdnUrl = process.env.npm_config_terraform_cdnurl || process.env.TERRAFORM_CDNURL ||  'https://dl.bintray.com/mitchellh/terraform';
var downloadUrl = helper.downloadUri(cdnUrl);
var originalPath = process.env.PATH;
var libPath = path.join(__dirname, 'lib')
var pkgPath = path.join(libPath, 'terraform')

function exit(code) {
  var validExit = true;
  process.env.PATH = originalPath;
  process.exit(code || 0);
}

function downloadTerraform(downloadLocation){
    return new Promise(function(resolve, reject){
        var bar = null;

        requestProgress(request(downloadUrl), {
            throttle: 2000,  // Throttle the progress event to 2000ms, defaults to 1000ms
            delay: 1000      // Only start to emit after 1000ms delay, defaults to 10000ms
        })
        .on('progress', function (state) {
            if (!bar) {
                bar = new progress('  [:bar] :percent :etas', {total: state.total, width: 40})
            }
            bar.curr = state.received
            bar.tick(0)
        })
        .on('error', function (err) {
            console.log();
            reject(err);
        })
        .pipe(fs.createWriteStream(downloadLocation))
        .on('error', function (err) {
            console.log();
            reject(err);
        })
        .on('close', function (err) {
            console.log();
            resolve(downloadLocation);
        })
    });
}

function getTerraformBinary(tmpDirectory){
    return new Promise(function(resolve, reject){
        var downloadLocation = tmpDirectory + '/' + helper.filename();
        if (!fs.existsSync(downloadLocation)) {
            downloadTerraform(downloadLocation).then(resolve).catch(reject);
        } else {
            console.log('Download already available at', downloadLocation);
            resolve(downloadLocation);
        }
    });
}

function whichTerraform() {
    return new Promise(function(resolve, reject) {
        which('terraform', function (error, resolvedPath) {
            if(error) {
                reject(error);
            } else {
                resolve(resolvedPath);
            }
        });
    });
}

function findSuitableTempDirectory() {
    return new Promise(function(resolve, reject){
        var candidateTmpDirs = [
            process.env.TMPDIR || process.env.TEMP,
            '/tmp',
            path.join(process.cwd(), 'tmp')
        ]

        for (var i = 0; i < candidateTmpDirs.length; i++) {
            var candidatePath = path.join(candidateTmpDirs[i], 'terraform')

            try {
                mkdirp.sync(candidatePath, {mode:'0777'});
                resolve(candidatePath);
            } catch (e) {
                console.log(candidatePath, 'is not writable:', e.message)
            }
        }
        reject();
    });
}

function extractTerraform(filepath) {
    return new Promise(function(resolve, reject) {
        try {
            var extractedpath = filepath + '-extract-' + Date.now();
            console.log('Extracting terraform from ' + filepath);
            var zip = new AdmZip(filepath);
            zip.extractAllTo(extractedpath, true);
            resolve(extractedpath);
        } catch (err) {
            console.error('Error extracting zip');
            reject(err)
        }
    });
}

function clearDirectory(extractedPath) {
    return new Promise(function(resolve, reject){
        rimraf(pkgPath, function(error){
            if(!error) {
                resolve(extractedPath);
            } else {
                console.log('oh noooooooo');
                reject(error);
            }
        });
    })
}

function copyIntoPlace(extractedPath) {
    return new Promise(function(resolve, reject){
        console.log('Copying extracted folder', extractedPath, '->', pkgPath);
        fs.rename(extractedPath, pkgPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(pkgPath);
            }
        });
    });
}

function setPermissions(terraformPath) {
    return new Promise(function(resolve, reject) {
        fs.readdirSync(terraformPath).forEach(function(file) {
            fs.chmodSync(terraformPath + '/' + file, '0777');
        });
        fs.readdirSync(__dirname + '/bin').forEach(function(file) {
            fs.chmodSync(terraformPath + '/' + file, '0777');
        });
        resolve(terraformPath);
    });
}

whichTerraform().then(function(path){
    return path;
}).catch(function(error){
    return findSuitableTempDirectory()
        .then(getTerraformBinary)
        .then(extractTerraform)
        .then(clearDirectory)
        .then(copyIntoPlace)
        .then(setPermissions)
        .catch(console.error);
}).then(console.log);
