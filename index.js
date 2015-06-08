'use strict';

var cp = require('child_process'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    rimraf = require('rimraf');

function WorldEngine() {
    var _config = {},
        _this = this;

    this.tempDir = null;

    function findSuitableTempDirectory() {
        return new Promise(function(resolve, reject){
            var candidateTmpDirs = [
                process.env.TMPDIR || process.env.TEMP,
                '/tmp',
                path.join(process.cwd(), 'tmp')
            ]

            for (var i = 0; i < candidateTmpDirs.length; i++) {
                var now = Date.now();
                var candidatePath = path.join(candidateTmpDirs[i], 'terraform', now.toString());

                try {
                    mkdirp(candidatePath, {mode:'0777'});
                    _this.tempDir = candidatePath;
                    resolve(candidatePath);
                } catch (e) {
                    throw(candidatePath, 'is not writable:', e.message)
                }
            }
            reject();
        });
    }

    function addProvider(type, settings) {
        _config.provider = _config.provider || {};
        _config.provider[type] = settings;
    }

    function addResource(type, name, settings) {
        _config.resource = _config.resource || {};
        _config.resource[type] = _config.resource[type] || {};
        _config.resource[type][name] = settings;
    }

    function getConfig() {
        return new Promise(function(resolve, reject){
            try {
                resolve(JSON.stringify(_config, null, 2));
            } catch(e) {
                reject(e);
            }
        });
    }

    function getTempDir() {
        return new Promise(function(resolve, reject){
            if(_this.tempDir) {
                resolve(_this.tempDir);
            } else {
                resolve(findSuitableTempDirectory())
            }
        });
    }

    function terraform(action, options) {
        options = options || {};

        return function(config){
            options.cwd = _this.tempDir;
            return writeConfig(config).then(function(){
                return new Promise(function(resolve, reject){
                    var response = "";
                    var terraformChild = cp.spawn(__dirname + '/bin/terraform', [action], options);

                    terraformChild.stdout.on('data', function(data){
                        response += data.toString();
                    });

                    terraformChild.stderr.on('data', function(data){
                        reject(data.toString());
                    });

                    terraformChild.on('close', function (code) {
                        if (code !== 0) {
                            reject('terraform process exited with code ' + code);
                        }
                        terraformChild.stdin.end();
                        resolve(response);
                    });
                });
            });
        }
    }

    function clearDirectory(input) {
        return new Promise(function(resolve, reject){
            rimraf(_this.tempDir, function(error){
                if(!error) {
                    resolve(input);
                } else {
                    reject(error);
                }
            });
        })
    }

    function plan() {
        getTempDir()
            .then(getConfig)
            .then(terraform('plan'))
            .then(clearDirectory)
            .then(console.log)
            .catch(console.error);
    }

    function apply() {
        getTempDir()
            .then(getConfig)
            .then(terraform('apply'))
            .then(clearDirectory)
            .then(console.log)
            .catch(console.error);
    }

    function destroy() {
        getTempDir()
            .then(getConfig)
            .then(terraform('destroy'))
            .then(clearDirectory)
            .then(console.log)
            .catch(console.error);
    }

    function writeConfig(config){
        return new Promise(function(resolve, reject) {
            var now = Date.now(),
                configFile = _this.tempDir + '/settings.tf';

            fs.writeFile(configFile, config, function (err) {
                if (err) {
                    reject(err);
                }
                resolve('It\'s saved!');
            });
        });
    }

    return {
        addResource: addResource,
        addProvider: addProvider,
        apply: apply,
        destroy: destroy,
        getConfig: getConfig,
        plan: plan
    };
}

var worldEngine = new WorldEngine();

worldEngine.addProvider(
    "aws",
    {
        "access_key": "ACCESS_KEY_HERE",
        "secret_key": "SECRET_KEY_HERE",
        "region": "us-east-1"
    }
)

worldEngine.addResource(
    "aws_instance",
    "example",
    {
        "ami": "ami-408c7f28",
        "instance_type": "t1.micro"
    }
);

worldEngine.destroy();
