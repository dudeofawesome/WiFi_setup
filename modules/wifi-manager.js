var exec = require('child_process').exec;
var fs = require('fs');
var utils = require('./utils');

module.exports = function () {
    var wifi = {
        init: function () {
            return new Promise(function (resolve) {
                resolve();
            });
        },
        stop: function () {
            return new Promise(function (resolve) {
                wifi.accessPoint.down();
                resolve();
            });
        },

        accessPoint: {
            status: 'down',
            up: function (SSID, password) {
                return new Promise(function (resolve) {
                    console.log('Turning AP on');
                    console.log('SSID: ' + SSID);
                    console.log('password: ' + password);
                    if (wifi.client.status !== 'down') {
                        resolve();
                    } else {
                        var hostapdPath = '/etc/hostapd/hostapd.conf';

                        // Backup old hostapd.conf
                        try {
                            if (fs.readFileSync(hostapdPath).toString().indexOf('# wifi-setup config') === -1) {
                                utils.backupFile(hostapdPath);
                            }
                        } catch (e) {}

                        var hostapdConf = fs.readFileSync('./modules/hostapd.conf.fill').toString();
                        hostapdConf = hostapdConf.replaceAll('{{SSID}}', SSID);
                        hostapdConf = hostapdConf.replaceAll('{{password}}', password);
                        fs.writeFileSync(hostapdPath, hostapdConf);

                        var interfacesPath = '/etc/network/interfaces';

                        // Backup old hostapd.conf
                        try {
                            if (fs.readFileSync(interfacesPath).toString().indexOf('# wifi-setup config') === -1) {
                                utils.backupFile(interfacesPath);
                            }
                        } catch (e) {}

                        var interfaces = fs.readFileSync('./modules/interfaces.fill').toString();
                        interfaces = interfaces.replaceAll('{{IP}}', '192.168.42.1');
                        interfaces = interfaces.replaceAll('{{hostapd}}', hostapdPath);
                        fs.writeFileSync(interfacesPath, interfaces);

                        // exec('ifconfig wlan0 up', function (error, stdout, stderr) {
                        //     exec('iwconfig wlan0 mode ad-hoc', function (error, stdout, stderr) {
                        //         exec('iwconfig wlan0 essid ' + SSID, function (error, stdout, stderr) {
                        //             exec('ifconfig wlan0 192.168.1.1 netmask 255.255.255.0', function (error, stdout, stderr) {
                        //                 console.log(error + '\n' + stdout + '\n' + stderr);
                        //                 // fs.writeFileSync('./start_ap', 'ifconfig wlan0 up 192.168.5.1 netmask 255.255.255.0\nsleep 5\nif [ \'$(ps | grep udhcpd)\' == \'\' ]; then\nudhcpd wlan0 &\nfi\nsleep 2\nhostapd /etc/hostapd/hostapd.conf 1>/dev/null\nkillall udhcpd');
                        //                 // fs.chmodSync('./start_ap', 0777);
                        //                 // exec('./start_ap', function (error, stdout, stderr) {
                        //                 //   console.log(error + '\n' + stdout + '\n' + stderr);
                        //                     if (callbacks.onAPstart) {
                        //                         callbacks.onAPstart(SSID, password);
                        //                     }
                        //                 // });
                        //             }
                        //         }
                        //     }
                        // }

                        exec('/etc/init.d/hostapd restart', function (err, stdout) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(stdout);
                                wifi.accessPoint.status = 'up';
                                resolve({SSID: SSID, password: password});
                            }
                        });
                    }
                });
            },
            down: function () {
                return new Promise(function (resolve) {
                    console.log('Turning AP off');
                    if (wifi.accessPoint.status === 'up') {
                        exec('systemctl stop hostapd', function () {
                            console.log('WiFi AP stopped');
                            wifi.accessPoint.status = 'down';
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            }
        },
        client: {
            status: 'down',
            connect: function (SSID, password) {
                return new Promise(function (resolve, reject) {
                    console.log('Connecting to ' + SSID);
                    if (wifi.accessPoint.status !== 'down') {
                        reject();
                    } else {
                        exec('ifconfig wlan0 up && iwconfig wlan0 essid ' + SSID + ' key s:' + password, function (err, stdout) {
                            if (err) {
                                console.log(err);
                            } else {
                                exec('dhclient wlan0', function () {
                                    console.log(stdout);
                                    wifi.client.status = 'connected';
                                    resolve(stdout);
                                });
                                console.log(stdout);
                            }
                        });
                    }
                });
            },
            disconnect: function () {
                return new Promise(function (resolve) {
                    console.log('Disconnecting WiFi');
                    wifi.client.status = 'down';
                    resolve();
                });
            }
        }
    };

    return wifi;
};
