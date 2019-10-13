/* jshint -W097 */
/* jshint strict:false */
/* global require */
/* global RRule */
/* global __dirname */
/* jslint node: true */
'use strict';

const {
  AIR_PURIFIER_INFORMATION,
  AIR_PURIFIER_CONTROL,
  AIR_PURIFIER_ERROR,
  AIR_PURIFIER_POWER,
  AIR_PURIFIER_MODE,
  AIR_PURIFIER_MODE_NIGHT,
  AIR_PURIFIER_MODE_AUTO,
  AIR_PURIFIER_MODE_MANUAL,
  AIR_PURIFIER_MANUALLEVEL,
  AIR_PURIFIER_TEMPERATURE,
  AIR_PURIFIER_HUMIDITY,
  AIR_PURIFIER_PM25
} = require(__dirname + "/miairpurifierconstants");

const fs = require('fs');

const utils = require('@iobroker/adapter-core');
let adapter;
const miairpurifier = require(__dirname + "/miairpurifier");
let purifier;
let isConnected = false;
let reconnectTimeout;

function startAdapter(options) {
  options = options || {};
  Object.assign(options, {
    name: "mihome-airpurifier",
    stateChange: function (id, state) {
      // Warning, state can be null if it was deleted
      adapter.log.debug("stateChange " + id + " " + JSON.stringify(state));

      var namespace = adapter.namespace + ".";

      // you can use the ack flag to detect if it is status (true) or command (false)
      if (state && !state.ack) {
        if (isConnected) {
          switch (id) {
            case namespace + AIR_PURIFIER_CONTROL + AIR_PURIFIER_POWER:
              _setPower(state.val)
              break;

            case namespace + AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_NIGHT:
              _setMode(AIR_PURIFIER_MODE_NIGHT);
              break;

            case namespace + AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_AUTO:
              _setMode(AIR_PURIFIER_MODE_AUTO);
              break;

            case namespace + AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_MANUAL:
              _setMode(AIR_PURIFIER_MODE_MANUAL);
              break;

            case namespace + AIR_PURIFIER_CONTROL + AIR_PURIFIER_MANUALLEVEL:
              _setManual(state.val);
              break;
          }
        } else {
          adapter.log.debug("Not yet connected.");
        }
      }
    },
    unload: function (callback) {
      callback();
    },
    ready: function () {
      main();
    }
  })

  adapter = new utils.Adapter(options);

  return adapter;
}

function main() {
  _initObjects();
  adapter.subscribeStates("*");
  purifier = new miairpurifier(adapter);
  _connect();
}

function _initObjects() {
  adapter.setObjectNotExists(AIR_PURIFIER_CONTROL + AIR_PURIFIER_POWER, {
    type: "state",
    common: {
      name: "Power On/Off",
      type: "boolean",
      role: "switch.power",
      read: true,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, {
    type: "state",
    common: {
      name: "Mode",
      type: "string",
      role: "text",
      read: true,
      write: false,
      states: {
        auto: "Auto",
        night: "Night",
        manual: "Manual"
      }
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_NIGHT, {
    type: "state",
    common: {
      name: "Night Mode",
      type: "boolean",
      role: "button.mode.night",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_AUTO, {
    type: "state",
    common: {
      name: "Auto Mode",
      type: "boolean",
      role: "button.mode.auto",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_CONTROL + AIR_PURIFIER_MODE_MANUAL, {
    type: "state",
    common: {
      name: "Manual Mode",
      type: "boolean",
      role: "button.mode.manual",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_CONTROL + AIR_PURIFIER_MANUALLEVEL, {
    type: "state",
    common: {
      name: "Manual Level",
      type: "number",
      role: "level",
      min: 0,
      max: 100,
      unit: "%",
      read: true,
      write: true
    }
  });
  adapter.setObjectNotExists(
    AIR_PURIFIER_INFORMATION + AIR_PURIFIER_TEMPERATURE, {
      type: "state",
      common: {
        name: "Temperature",
        type: "number",
        role: "value.temperature",
        unit: "°C",
        read: true,
        write: false
      }
    }
  );
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_HUMIDITY, {
    type: "state",
    common: {
      name: "Relative Humidity",
      type: "number",
      role: "value.humidity",
      unit: "%",
      read: true,
      write: false
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_PM25, {
    type: "state",
    common: {
      name: "Pollution in PM2.5",
      type: "number",
      role: "value",
      read: true,
      write: false
    }
  });
}

function _connect(command) {
  adapter.log.info("Connecting...");
  purifier.removeAllListeners();
  purifier.addListener(AIR_PURIFIER_ERROR, function (error) {
    adapter.log.error(error);
  });
  clearTimeout(reconnectTimeout);
  purifier
    .connect()
    .then(function (status) {
      if (status === true) {
        adapter.log.info("Connected!");
        _setupListeners();
        purifier.checkInitValues();
        purifier.subscribeToValues();
        isConnected = true;
        if (command) {
          command();
        }
      } else {
        adapter.log.error("Wronge device type");
      }
    })
    .catch(function (error) {
      adapter.log.info("Error while connecting");
      reconnect(false);
    });
}

function reconnect(withoutTimeout, command) {
  isConnected = false;
  if (withoutTimeout) {
    adapter.log.info("Retry connection & command");
    _connect(command);
  } else {
    var interval = adapter.config.reconnectTime * 1000;
    if (interval > 0) {
      adapter.log.info("Retry in " + adapter.config.reconnectTime + " second(s)");
      reconnectTimeout = setTimeout(function () {
        _connect(command);
      }, interval);
    }
  }
}

function _setupListeners() {
  // Power
  purifier.addListener(AIR_PURIFIER_POWER, function (power) {
    adapter.log.debug(AIR_PURIFIER_POWER + ": " + power);
    _setState(AIR_PURIFIER_CONTROL + AIR_PURIFIER_POWER, power);
  });
  // Mode
  purifier.addListener(AIR_PURIFIER_MODE, function (mode) {
    adapter.log.debug(AIR_PURIFIER_MODE + ": " + mode);
    _setModeState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, mode);
  });
  // Favorite Level
  purifier.addListener(AIR_PURIFIER_MANUALLEVEL, function (favorite) {
    adapter.log.debug(AIR_PURIFIER_MANUALLEVEL + ": " + favorite);
    let maxValue = 14;
    if (adapter.config.air2) {
      maxValue = 16;
    } else if (adapter.config.air2s) {
      maxValue = 14;
    }
    const value = Math.floor((favorite / maxValue) * 100);
    _setState(AIR_PURIFIER_CONTROL + AIR_PURIFIER_MANUALLEVEL, value);
  });
  // Temperature
  purifier.addListener(AIR_PURIFIER_TEMPERATURE, function (temp) {
    adapter.log.debug(AIR_PURIFIER_TEMPERATURE + ": " + temp);
    const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_TEMPERATURE, tempNumber);
  });
  // Relative Humidity
  purifier.addListener(AIR_PURIFIER_HUMIDITY, function (rh) {
    adapter.log.debug(AIR_PURIFIER_HUMIDITY + ": " + rh);
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_HUMIDITY, rh);
  });
  // PM 2.5
  purifier.addListener(AIR_PURIFIER_PM25, function (pm25) {
    adapter.log.debug(AIR_PURIFIER_PM25 + ": " + pm25);
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_PM25, pm25);
  });
}

function _setMode(mode, favoriteLevel) {
  let modeSend;
  switch (mode) {
    case AIR_PURIFIER_MODE_AUTO:
      modeSend = "auto";
      break;
    case AIR_PURIFIER_MODE_NIGHT:
      modeSend = "silent";
      break;
    case AIR_PURIFIER_MODE_MANUAL:
      modeSend = "favorite";
      break;
  }
  if (modeSend) {
    purifier.setMode(modeSend).then(result => {
      if (result) {
        _setModeState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, mode)
        _setState(AIR_PURIFIER_CONTROL + AIR_PURIFIER_POWER, true);
        if (favoriteLevel) {
          purifier.setFavoriteLevel(favoriteLevel);
        }
      } else {
        reconnect(true, () => _setMode(mode, favoriteLevel));
      }
    })
      .catch(err => {
        reconnect(true, () => _setMode(mode, favoriteLevel));
      })
  }
}

function _setModeState(mode, value) {
  let modeSend;
  switch (value) {
    case "auto":
      modeSend = AIR_PURIFIER_MODE_AUTO;
      break;
    case "silent":
      modeSend = AIR_PURIFIER_MODE_NIGHT;
      break;
    case "favorite":
      modeSend = AIR_PURIFIER_MODE_MANUAL;
      break;
  }
  if (modeSend) {
    _setState(mode, modeSend);
  }
}

function _setPower(power) {
  purifier.setPower(power).then(result => {
    if (result) {
      _setState(AIR_PURIFIER_CONTROL + AIR_PURIFIER_POWER, power);
    } else {
      reconnect(true, () => _setPower(power));
    }
  })
    .catch(err => {
      reconnect(true, () => _setPower(power));
    })
}

function _setManual(stateVal) {
  let maxValue = 14;
  if (adapter.config.air2) {
    maxValue = 16;
  } else if (adapter.config.air2s) {
    maxValue = 14;
  }
  const value = Math.ceil((stateVal / 100) * maxValue);
  _setMode(AIR_PURIFIER_MODE_MANUAL, value);
}

function _setState(state, value) {
  adapter.setState(state, {
    val: value,
    ack: true
  });
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
  module.exports = startAdapter;
} else {
  // or start the instance directly
  startAdapter();
} 
