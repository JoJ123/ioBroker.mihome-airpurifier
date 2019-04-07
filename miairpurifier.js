/* jshint -W097 */
// jshint strict:false
/* jslint node: true */
/* jslint esversion: 6 */

"use strict";
const {
  AIR_PURIFIER_POWER,
  AIR_PURIFIER_TEMPERATURE,
  AIR_PURIFIER_HUMIDITY,
  AIR_PURIFIER_MODE,
  AIR_PURIFIER_MANUALLEVEL,
  AIR_PURIFIER_PM25
} = require(__dirname + "/miairpurifierconstants");

module.exports = class miairpurifier extends require("events").EventEmitter {
  constructor(adapter) {
    super();

    adapter.log.debug("config ip: " + adapter.config.ipaddress);
    adapter.log.debug("config token: " + adapter.config.token);

    this.ipaddress = adapter.config.ipaddress;
    if (!this.ipaddress) {
      adapter.log.error(
        "mihome-airpurifier needs an ip address, take default IP: 127.0.0.1"
      );
      this.ipaddress = "127.0.0.1";
    }

    this.token = adapter.config.token;
    if (!this.token) {
      adapter.log.error("mihome-airpurifier needs a token, take empty token");
      this.token = "";
    }

    this.miio = require("miio");

    this.adapter = adapter;
  }

  disconnect() {
    if (this.device) {
      this.adapter.log.info("Unsubscribe from device.")
      this.device.destroy();
    }
  }

  connect() {
    let instance = this;

    return this.miio
      .device({
        address: this.ipaddress,
        token: this.token
      })
      .then(device => {
        instance.device = device;
        if (device.matches("type:air-purifier")) {
          return true;
        } else {
          return false;
        }
      })
      .catch(err => {
        throw new Error(err)
      });
  }

  subscribeToValues() {
    this.device.on("powerChanged", isOn => this.emit(AIR_PURIFIER_POWER, isOn));
    this.device.on("modeChanged", mode => this.emit(AIR_PURIFIER_MODE, mode));
    this.device.on("temperatureChanged", temp =>
      this.emit(AIR_PURIFIER_TEMPERATURE, temp)
    );
    this.device.on("relativeHumidityChanged", rh =>
      this.emit(AIR_PURIFIER_HUMIDITY, rh)
    );
    this.device.on("pm2.5Changed", pm25 => this.emit(AIR_PURIFIER_PM25, pm25));
    this.device.on("favoriteLevel", favoriteLevel =>
      this.emit(AIR_PURIFIER_MANUALLEVEL, favoriteLevel)
    );
  }

  checkInitValues() {
    // Power
    this.device
      .power()
      .then(isOn => this.emit(AIR_PURIFIER_POWER, isOn))
      .catch(err =>
        this.emit(AIR_PURIFIER_ERROR, "no " + AIR_PURIFIER_POWER + " data")
      );
    // Mode
    this.device
      .mode()
      .then(mode => this.emit(AIR_PURIFIER_MODE, mode))
      .catch(err =>
        this.emit(AIR_PURIFIER_ERROR, "no " + AIR_PURIFIER_MODE + " data")
      );
    // Favorite Level
    this.device
      .favoriteLevel()
      .then(favoriteLevel => this.emit(AIR_PURIFIER_MANUALLEVEL, favoriteLevel))
      .catch(err =>
        this.emit(
          AIR_PURIFIER_ERROR,
          "no " + AIR_PURIFIER_MANUALLEVEL + " data"
        )
      );
    // Temperature
    this.device
      .temperature()
      .then(temp => this.emit(AIR_PURIFIER_TEMPERATURE, temp))
      .catch(err =>
        this.emit(
          AIR_PURIFIER_ERROR,
          "no " + AIR_PURIFIER_TEMPERATURE + " data"
        )
      );
    // Relative Humidity
    this.device
      .relativeHumidity()
      .then(rh => this.emit(AIR_PURIFIER_HUMIDITY, rh))
      .catch(err =>
        this.emit(AIR_PURIFIER_ERROR, "no " + AIR_PURIFIER_HUMIDITY + " data")
      );
    // PM 2.5
    this.device
      .pm2_5()
      .then(pm25 => this.emit(AIR_PURIFIER_PM25, pm25))
      .catch(err =>
        this.emit(AIR_PURIFIER_ERROR, "no " + AIR_PURIFIER_PM25 + " data")
      );
  }

  setPower(isOn) {
    return this.device.power(isOn)
      .then(result => result === isOn)
      .catch(err => false);
  }

  setMode(mode) {
    if (
      ["auto", "silent", "favorite"].some(possibleMode => possibleMode === mode)
    ) {
      return this.device
        .setMode(mode)
        .then(result => result === mode)
        .catch(err => false);
    }
    return false;
  }

  setFavoriteLevel(favoriteLevel) {
    if (favoriteLevel >= 0 && favoriteLevel <= 14) {
      this.device.setFavoriteLevel(favoriteLevel)
    }
  }
};