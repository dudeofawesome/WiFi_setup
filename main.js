require('es6-promise').polyfill();

String.prototype.replaceAll = function (find, replace) {
    return this.replace(new RegExp(find, 'g'), replace);
};




var bodyParser = require('body-parser');

var wifiManager = require('./modules/wifi-manager')();
var server = require('./modules/server')({
    onClientConfiguring: function () {

    },
    onSetupComplete: function (settings) {
        console.log(settings);
    }
});

module.exports = function (SERVICE_NAME, express, app, database) {
    if (!express) {
        express = require('express');
    }
    if (!app) {
        app = express();
    }
    if (!database) {
        database = require('./modules/database');
        database.init().then(function () {
            database.start();
        });
    }

    var wifiSetup = {
        init: function (callbacks) {
            return new Promise(function (resolve) {
                if (module.exports.callbacks) {
                    module.exports.callbacks = callbacks;
                }

                app.use(bodyParser.json());
                app.use(bodyParser.urlencoded({
                    extended: true
                }));

                Promise.all([wifiManager.init(), server.init()]).then(function () {
                    resolve();
                }).catch(function (errs) {
                    console.log('Something failed to initialize');
                    console.log(errs);
                });
            });
        },
        start: function () {
            return new Promise(function (resolve) {
                if (configured) {
                    wifiManager.client.connect('TODO', 'get from DB!!!').then(function (SSID, IP) {
                        if (module.exports.callbacks && module.exports.callbacks.onConnectToWIFI) {
                            module.exports.callbacks.onConnectToWIFI(SSID, IP);
                        }
                    }).catch(function (err) {
                        console.log(err);
                        wifiManager.accessPoint.up(SERVICE_NAME, 'testtest').then(function (SSID, password) {
                            if (module.exports.callbacks && module.exports.callbacks.onAPstart) {
                                module.exports.callbacks.onAPstart(SSID, password);
                            }
                        });
                    });
                } else {
                    wifiManager.accessPoint.up(SERVICE_NAME, 'testtest').then(function (SSID, password) {
                        if (module.exports.callbacks && module.exports.callbacks.onAPstart) {
                            module.exports.callbacks.onAPstart(SSID, password);
                        }
                    });
                }

                resolve();
            });
        },
        stop: function () {
            return new Promise(function (resolve) {
                Promise.all([wifiManager.stop()]).then(function () {
                    resolve();
                }).catch(function (errs) {
                    console.log('Something failed to stop');
                    console.log(errs);
                });
            });
        }
    };

    return wifiSetup;
};

var configured = false;