/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
"use strict";

const {
  AIR_PURIFIER_INFORMATION,
  AIR_PURIFIER_ERROR,
  AIR_PURIFIER_POWER,
  AIR_PURIFIER_MODE,
  AIR_PURIFIER_FAVORITELEVEL,
  AIR_PURIFIER_TEMPERATURE,
  AIR_PURIFIER_HUMIDITY,
  AIR_PURIFIER_PM25,
  AIR_PURIFIER_MODE_SILENT,
  AIR_PURIFIER_MODE_AUTO,
  AIR_PURIFIER_MODE_FAVORITE
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

  var namespace = adapter.namespace + "."

  // you can use the ack flag to detect if it is status (true) or command (false)
  if (state && !state.ack) {
    switch (id) {
      case namespace + AIR_PURIFIER_POWER:
        purifier.setPower(state.val);
        break;

      case namespace + AIR_PURIFIER_MODE_SILENT:
        _setMode(AIR_PURIFIER_MODE_SILENT);
        break;

      case namespace + AIR_PURIFIER_MODE_AUTO:
        _setMode(AIR_PURIFIER_MODE_AUTO);
        break;

      case namespace + AIR_PURIFIER_MODE_FAVORITE:
        _setMode(AIR_PURIFIER_MODE_FAVORITE);
        break;

      case namespace + AIR_PURIFIER_FAVORITELEVEL:
        _setFavorite(state.val);
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
      name: AIR_PURIFIER_POWER,
      type: "boolean",
      role: "switch.power",
      read: true,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, {
    type: "state",
    common: {
      name: AIR_PURIFIER_MODE,
      type: "string",
      role: "text",
      read: true,
      write: false
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_SILENT, {
    type: "state",
    common: {
      name: AIR_PURIFIER_MODE_SILENT,
      type: "boolean",
      role: "button.start",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_AUTO, {
    type: "state",
    common: {
      name: AIR_PURIFIER_MODE_AUTO,
      type: "boolean",
      role: "button.start",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_MODE_FAVORITE, {
    type: "state",
    common: {
      name: AIR_PURIFIER_MODE_FAVORITE,
      type: "boolean",
      role: "button.start",
      read: false,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_FAVORITELEVEL, {
    type: "state",
    common: {
      name: AIR_PURIFIER_FAVORITELEVEL,
      type: "number",
      role: "level",
      min: 0,
      max: 100,
      unit: "%",
      read: true,
      write: true
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_TEMPERATURE, {
    type: "state",
    common: {
      name: AIR_PURIFIER_TEMPERATURE,
      type: "number",
      role: "value.temperature",
      unit: "°C",
      read: true,
      write: false
    }
  });
  adapter.setObjectNotExists(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_HUMIDITY, {
    type: "state",
    common: {
      name: AIR_PURIFIER_HUMIDITY,
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
      name: AIR_PURIFIER_PM25,
      type: "number",
      role: "value",
      read: true,
      write: false
    }
  });
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
    adapter.setState(AIR_PURIFIER_POWER, {
      val: power,
      ack: true
    });
  });
  // Mode
  purifier.addListener(AIR_PURIFIER_MODE, function (mode) {
    adapter.setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_MODE, {
      val: mode,
      ack: true
    });
  });
  // Favorite Level
  purifier.addListener(AIR_PURIFIER_FAVORITELEVEL, function (favorite) {
    const value = Math.floor((favorite / 14) * 100);
    adapter.setState(AIR_PURIFIER_FAVORITELEVEL, {
      val: value,
      ack: true
    });
  });
  // Temperature
  purifier.addListener(AIR_PURIFIER_TEMPERATURE, function (temp) {
    const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
    adapter.setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_TEMPERATURE, {
      val: tempNumber,
      ack: true
    });
  });
  // Relative Humidity
  purifier.addListener(AIR_PURIFIER_HUMIDITY, function (rh) {
    adapter.setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_HUMIDITY, {
      val: rh,
      ack: true
    });
  });
  // PM 2.5
  purifier.addListener(AIR_PURIFIER_PM25, function (pm25) {
    adapter.setState(AIR_PURIFIER_INFORMATION + AIR_PURIFIER_PM25, {
      val: pm25,
      ack: true
    });
  });
}

function _setMode(mode) {
  purifier.setMode(mode);
  adapter.setState(AIR_PURIFIER_POWER, {
    val: true,
    ack: true
  });
}

function _setFavorite(stateVal) {
  const value = Math.ceil((stateVal / 100) * 14);
  if (value > 0) {
    adapter.setState(AIR_PURIFIER_POWER, {
      val: true,
      ack: true
    });
    purifier.setFavoriteLevel(value);
    purifier.setMode(AIR_PURIFIER_MODE_FAVORITE);
  } else {
    purifier.setPower(false);
    adapter.setState(AIR_PURIFIER_POWER, {
      val: false,
      ack: true
    });
  }
}