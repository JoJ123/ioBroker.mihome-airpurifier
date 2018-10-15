/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
"use strict";

const {
  AIR_PURIFIER_INFORMATION,
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

const utils = require(__dirname + "/lib/utils");
const adapter = new utils.Adapter("mihome-airpurifier");
const miairpurifier = require(__dirname + "/miairpurifier");
let purifier;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on("unload", function (callback) {
  try {
    adapter.log.info("cleaned everything up...");
    callback();
  } catch (e) {
    callback();
  }
});

// is called if a subscribed object changes
adapter.on("objectChange", function (id, obj) {
  // Warning, obj can be null if it was deleted
  adapter.log.debug("objectChange " + id + " " + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on("stateChange", function (id, state) {
  // Warning, state can be null if it was deleted
  adapter.log.debug("stateChange " + id + " " + JSON.stringify(state));

  var namespace = adapter.namespace + ".";

  // you can use the ack flag to detect if it is status (true) or command (false)
  if (state && !state.ack) {
    switch (id) {
      case namespace + AIR_PURIFIER_POWER:
        purifier.setPower(state.val);
        break;

      case namespace + AIR_PURIFIER_MODE_NIGHT:
        _setMode(AIR_PURIFIER_MODE_NIGHT);
        break;

      case namespace + AIR_PURIFIER_MODE_AUTO:
        _setMode(AIR_PURIFIER_MODE_AUTO);
        break;

      case namespace + AIR_PURIFIER_MODE_MANUAL:
        _setMode(AIR_PURIFIER_MODE_MANUAL);
        break;

      case namespace + AIR_PURIFIER_MANUALLEVEL:
        _setManual(state.val);
        break;
    }
  }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on("message", function (obj) {
  if (typeof obj === "object" && obj.message) {
    if (obj.command === "send") {
      // e.g. send email or pushover or whatever
      console.log("send command");

      // Send response in callback if required
      if (obj.callback)
        adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
    }
  }
});

// is called when databases are connected and adapter received configuration.
adapter.on("ready", function () {
  _initObjects();
  adapter.subscribeStates("*");
  purifier = new miairpurifier(adapter);
  _connect();
});

function _initObjects() {
  adapter.setObjectNotExists(AIR_PURIFIER_POWER, {
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
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_NIGHT, {
    type: "state",
    common: {
      name: "Night Mode",
      type: "boolean",
      role: "button.mode.night",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_AUTO, {
    type: "state",
    common: {
      name: "Auto Mode",
      type: "boolean",
      role: "button.mode.auto",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_MANUAL, {
    type: "state",
    common: {
      name: "Manual Mode",
      type: "boolean",
      role: "button.mode.manual",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MANUALLEVEL, {
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
      name: "Polution in PM2.5",
      type: "number",
      role: "value",
      read: true,
      write: false
    }
  });
  // adapter.setObjectNotExists(
  //   AIR_PURIFIER_INFORMATION + AIR_PURIFIER_FILTERLIFE, {
  //     type: "state",
  //     common: {
  //       name: "Remaining Filter Life",
  //       type: "number",
  //       role: "value",
  //       read: true,
  //       write: false
  //     }
  //   }
  // );
}

function _connect() {
  adapter.log.info("Connecting...");
  purifier.removeAllListeners();
  purifier.addListener(AIR_PURIFIER_ERROR, function (error) {
    adapter.log.error(error);
  });
  purifier
    .connect()
    .then(function (status) {
      if (status === true) {
        adapter.log.info("Connected!");
        _setupListeners();
        purifier.checkInitValues();
        purifier.subscribeToValues();
      } else {
        adapter.log.error(status);
      }
    })
    .catch(function (error) {
      adapter.log.error(error);
    });
}

function _setupListeners() {
  // Power
  purifier.addListener(AIR_PURIFIER_POWER, function (power) {
    _setState(AIR_PURIFIER_POWER, power);
  });
  // Mode
  purifier.addListener(AIR_PURIFIER_MODE, function (mode) {
    _setModeState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, mode);
  });
  // Favorite Level
  purifier.addListener(AIR_PURIFIER_MANUALLEVEL, function (favorite) {
    let maxValue = 14;
    if (adapter.config.air2) {
      maxValue = 16;
    } else if (adapter.config.air2s) {
      maxValue = 14;
    }
    const value = Math.floor((favorite / maxValue) * 100);
    _setState(AIR_PURIFIER_MANUALLEVEL, value);
  });
  // Temperature
  purifier.addListener(AIR_PURIFIER_TEMPERATURE, function (temp) {
    const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_TEMPERATURE, tempNumber);
  });
  // Relative Humidity
  purifier.addListener(AIR_PURIFIER_HUMIDITY, function (rh) {
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_HUMIDITY, rh);
  });
  // PM 2.5
  purifier.addListener(AIR_PURIFIER_PM25, function (pm25) {
    _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_PM25, pm25);
  });
  // // Filter Life Remaining
  // purifier.addListener(AIR_PURIFIER_FILTERLIFE, function (life) {
  //   _setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_FILTERLIFE, life);
  // });
}

function _setMode(mode) {
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
    purifier.setMode(modeSend);
    _setState(AIR_PURIFIER_POWER, true);
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

function _setManual(stateVal) {
  let maxValue = 14;
  if (adapter.config.air2) {
    maxValue = 16;
  } else if (adapter.config.air2s) {
    maxValue = 14;
  }
  const value = Math.ceil((stateVal / 100) * maxValue);
  if (value > 0) {
    purifier.setFavoriteLevel(value);
    _setMode(AIR_PURIFIER_MODE_MANUAL);
  } else {
    purifier.setPower(false);
    _setState(AIR_PURIFIER_POWER, false);
  }
}

function _setState(state, value) {
  adapter.setState(state, {
    val: value,
    ack: true
  });
}