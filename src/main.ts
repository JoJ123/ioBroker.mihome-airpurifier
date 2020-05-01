/*
 * Created with @iobroker/create-adapter v1.23.0
 */

import * as utils from "@iobroker/adapter-core";
import { MiAirPurifier } from "./air-purifier/mi-air-purifier";
import { EVENT_AIR_PURIFIER_DEBUG_LOG, EVENT_AIR_PURIFIER_INFO_LOG, EVENT_AIR_PURIFIER_ERROR_LOG, EVENT_AIR_PURIFIER_POWER, EVENT_AIR_PURIFIER_MODE, EVENT_AIR_PURIFIER_MANUALLEVEL, EVENT_AIR_PURIFIER_TEMPERATURE, EVENT_AIR_PURIFIER_HUMIDITY, EVENT_AIR_PURIFIER_PM25, EVENT_AIR_PURIFIER_BUZZER, EVENT_AIR_PURIFIER_LED, EVENT_AIR_PURIFIER_FILTER_REMAINING, EVENT_AIR_PURIFIER_FILTER_USED } from "./air-purifier/mi-air-purifier-constants";
import { STATE_AIR_PURIFIER_CONTROL, STATE_AIR_PURIFIER_POWER, STATE_AIR_PURIFIER_INFORMATION, STATE_AIR_PURIFIER_MODE, STATE_AIR_PURIFIER_MODE_NIGHT, STATE_AIR_PURIFIER_MODE_AUTO, STATE_AIR_PURIFIER_MODE_MANUAL, STATE_AIR_PURIFIER_MANUALLEVEL, STATE_AIR_PURIFIER_TEMPERATURE, STATE_AIR_PURIFIER_HUMIDITY, STATE_AIR_PURIFIER_PM25, STATE_AIR_PURIFIER_BUZZER, STATE_AIR_PURIFIER_LED, STATE_AIR_PURIFIER_FILTER_REMAINING, STATE_AIR_PURIFIER_FILTER_USED } from "./types/adapter-states";

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ioBroker {
		interface AdapterConfig {
			token: string;
			ipaddress: string;
			reconnectTime: number;
			air2: boolean;
			air2s: boolean;
		}
	}
}


class MiHomeAirPurifier extends utils.Adapter {
	miAirPurifier: MiAirPurifier = new MiAirPurifier("", "");
	reconnectInterval = 60;
	reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
	checkRegularValuesInterval: ReturnType<typeof setInterval> | undefined;
	isConnected = false;

	public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
		super({
			...options as any,
			name: "mihome-airpurifier",
		});
		
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.log.info("Started");

		this.miAirPurifier = new MiAirPurifier(this.config.ipaddress, this.config.token);
		this.reconnectInterval = this.config.reconnectTime * 1000;

		this.initObjects();
		this.subscribeStates("*");
		this.setupListeners();
		this.connect();
	}

	private async initObjects(): Promise<void> {
		const existingStates = Object.keys(await this.getStatesAsync("*"));
		await Promise.all(existingStates.map(state => this.delStateAsync(state)));
		await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, {
			type: "state",
			common: {
				name: "Power On/Off",
				type: "boolean",
				role: "switch.power",
				read: true,
				write: true
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_MODE, {
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
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_NIGHT, {
			type: "state",
			common: {
				name: "Night Mode",
				type: "boolean",
				role: "button.mode.night",
				read: false,
				write: true
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_AUTO, {
			type: "state",
			common: {
				name: "Auto Mode",
				type: "boolean",
				role: "button.mode.auto",
				read: false,
				write: true
			},
			native: {}
	  	});
		 await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_MANUAL, {
			type: "state",
			common: {
				name: "Manual Mode",
				type: "boolean",
				role: "button.mode.manual",
				read: false,
				write: true
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MANUALLEVEL, {
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
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(
			STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_TEMPERATURE, {
				type: "state",
				common: {
					name: "Temperature",
					type: "number",
					role: "value.temperature",
					unit: "°C",
					read: true,
					write: false
				},
				native: {}
			},
	  	);
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_HUMIDITY, {
			type: "state",
			common: {
				name: "Relative Humidity",
				type: "number",
				role: "value.humidity",
				unit: "%",
				read: true,
				write: false
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_PM25, {
			type: "state",
			common: {
				name: "Pollution in PM2.5",
				type: "number",
				role: "value",
				read: true,
				write: false
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_BUZZER, {
			type: "state",
			common: {
				name: "Buzzer On/Off",
				type: "boolean",
				role: "switch.power",
				read: true,
				write: true
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_LED, {
			type: "state",
			common: {
				name: "Display On/Off",
				type: "boolean",
				role: "switch.power",
				read: true,
				write: true
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_FILTER_REMAINING, {
			type: "state",
			common: {
				name: "Filter hours remaining",
				type: "number",
				role: "value",
				read: true,
				write: false
			},
			native: {}
	  	});
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_FILTER_USED, {
			type: "state",
			common: {
				name: "Filter hours used",
				type: "number",
				role: "value",
				read: true,
				write: false
			},
			native: {}
	  	});
	}

	private async connect(command?: any): Promise<void> {
		this.log.info("Connecting...");
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		try {
			const state = await this.miAirPurifier.connect()
			if (state) {
				this.log.info("Connected!");
				this.isConnected = true;
				this.afterConnect(command);
			} else {
				this.log.error("Wronge device type.");
			}
		} catch (err) {
			this.log.info("Error while connecting");
			this.reconnect(false);
		}
	}

	private afterConnect(command?: any): void {
		try {
			this.miAirPurifier.checkValues();
			this.miAirPurifier.subscribeToValues();
			this.checkRegularValuesInterval = setInterval(() => this.miAirPurifier.checkValues(), 1000 * 120);
			if (command) {
				command();
			}
		}
		catch (err) {
			this.log.error(`Error after connecting: ${JSON.stringify(err.stack)}`);			
			this.log.error(`Error after connecting: ${err.message}`);
		}
	}

	private reconnect(withoutTimeout: boolean, command?: any): void {
		this.isConnected = false;
		if (withoutTimeout) {
			this.log.info("Retry connection");
			this.connect(command);
		} else {
			if (this.reconnectInterval > 0) {
				this.log.info(`"Retry in ${this.config.reconnectTime} second(s)`);
				this.reconnectTimeout = setTimeout(() => this.connect(command), this.reconnectInterval);
			}
		}
	}

	private setupListeners(): void {
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_DEBUG_LOG, (msg: string) => {
			this.log.debug(msg);
		})
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_INFO_LOG, (msg: string) => {
			this.log.info(msg);
		})
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_ERROR_LOG, (err: string) => {
			this.log.error(err);
		})

		// Power
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_POWER, async (power: any) => {
			this.log.debug(`${EVENT_AIR_PURIFIER_POWER}: ${power}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, power, true);
		});

		// Mode
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_MODE, async (mode: any) => {
			this.log.debug(`${EVENT_AIR_PURIFIER_MODE}: ${mode}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_MODE , mode, true);
		});

		// Favorite Level
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_MANUALLEVEL, async (favorite: any) => {
			let maxValue = 14; // air2s
			if (this.config.air2) {
				maxValue = 16;
			}

		  	const value = Math.floor((favorite / maxValue) * 100);
		  	this.log.debug(`${EVENT_AIR_PURIFIER_MANUALLEVEL}: ${value}`);
		  	await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MANUALLEVEL, value, true);
		});

		// Temperature
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_TEMPERATURE, async (temp: any) => {
			const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
			this.log.debug(`${EVENT_AIR_PURIFIER_TEMPERATURE}: ${tempNumber}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_TEMPERATURE, tempNumber, true);
		});

		// Relative Humidity
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_HUMIDITY, async (rh: any)  =>{
		  	this.log.debug(`${EVENT_AIR_PURIFIER_HUMIDITY}: ${rh}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_HUMIDITY, rh, true);
		});
		// PM 2.5
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_PM25, async (pm25: any) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_PM25}: ${pm25}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_PM25, pm25, true);
		});
		// Buzzer
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_BUZZER, async (buzzer: boolean) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_BUZZER}: ${buzzer}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_BUZZER, buzzer, true);
		});
		// Led
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_LED, async (led: boolean) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_LED}: ${led}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_LED, led, true);
		});
		// Filter remaining
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_FILTER_REMAINING, async (hours: number) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_FILTER_REMAINING}: ${hours}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_FILTER_REMAINING, hours, true);
		});
		// Filter used
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_FILTER_USED, async (hours: number) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_FILTER_USED}: ${hours}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_FILTER_USED, hours, true);
		});
	  }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			this.log.info("cleaned everything up...");
			if (this.checkRegularValuesInterval) {
				clearInterval(this.checkRegularValuesInterval);
			}
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 */
	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		const namespace = this.namespace + "." + STATE_AIR_PURIFIER_CONTROL;
  
		if (state && !state.ack) {
		  	if (this.isConnected) {
				switch (id) {
					case namespace + STATE_AIR_PURIFIER_POWER:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setPower(!!state.val)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_NIGHT:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_NIGHT)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_AUTO:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_AUTO)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_MANUAL:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_MANUAL)
						break;
					case namespace + STATE_AIR_PURIFIER_MANUALLEVEL:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						if (typeof state.val === "number") {
							this.setManual(state.val)
						}
						break;
					case namespace + STATE_AIR_PURIFIER_BUZZER:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setBuzzer(!!state.val)
						break;
					case namespace + STATE_AIR_PURIFIER_LED:
						this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setLed(!!state.val)
						break;
				}
			} else {
				this.log.debug("Not yet connected.");
			}
		}
	}
	
	async setMode(mode: string, favoriteLevel?: number): Promise<void> {
		try {
			let modeSend;
			switch (mode) {
			  case STATE_AIR_PURIFIER_MODE_AUTO:
					modeSend = "auto";
					break;
			  case STATE_AIR_PURIFIER_MODE_NIGHT:
					modeSend = "silent";
					break;
			  case STATE_AIR_PURIFIER_MODE_MANUAL:
					modeSend = "favorite";
					break;
			}
			this.log.debug("setMode: " + modeSend);
			const result = await this.miAirPurifier.setMode(modeSend);
			if (result) {

				if (favoriteLevel) {
					this.log.debug("setFavoriteLevel: " + favoriteLevel);
					await this.miAirPurifier.setFavoriteLevel(favoriteLevel);
				}
			}			
		} catch(err) {
			this.log.error("setMode: Error:" + err.message);
		}
	}
  
	async setPower(power: boolean): Promise<void> {
		try {
			const result = await this.miAirPurifier.setPower(power)
			await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, result, true);
		} catch (err) {
			this.reconnect(true, () => this.setPower(power));
		}
	}
  
	async setBuzzer(buzzer: boolean): Promise<void> {
		try {
			const result = await this.miAirPurifier.setBuzzer(buzzer)
			if (!!result) {
				await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_BUZZER, result, true);
			}
		} catch (err) {
			this.reconnect(true, () => this.setBuzzer(buzzer));
		}
	}
  
	async setLed(led: boolean): Promise<void> {
		try {
			const result = await this.miAirPurifier.setLed(led)
			if (!!result) {
				await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_LED, result, true);
			}
		} catch (err) {
			this.reconnect(true, () => this.setLed(led));
		}
	}
  
	async setManual(stateVal: number): Promise<void> {
		const maxValue = this.config.air2 ? 16 : 14;
		stateVal = stateVal > 100 ? 100 : stateVal;
		stateVal = stateVal < 0 ? 0 : stateVal;
		const value = Math.ceil((stateVal / 100) * maxValue);

		await this.setMode(STATE_AIR_PURIFIER_MODE_MANUAL, value);
	}

}

if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<ioBroker.AdapterOptions> | undefined) => new MiHomeAirPurifier(options);
} else {
	// otherwise start the instance directly
 	(() => new MiHomeAirPurifier())();
}