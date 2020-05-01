import { EventEmitter } from "events";
import * as miio from "miio";
import { EVENT_AIR_PURIFIER_DEBUG_LOG, EVENT_AIR_PURIFIER_POWER, EVENT_AIR_PURIFIER_MODE, EVENT_AIR_PURIFIER_TEMPERATURE, EVENT_AIR_PURIFIER_HUMIDITY, EVENT_AIR_PURIFIER_MANUALLEVEL, EVENT_AIR_PURIFIER_ERROR_LOG, EVENT_AIR_PURIFIER_PM25 } from "./mi-air-purifier-constants";

export class MiAirPurifier extends EventEmitter {
	ipAddress: string;
	token: string;
	device: any;

	constructor(ipAddress: string, token: string) {
		super();

		this.ipAddress = ipAddress;
		this.token = token;
	}

	async disconnect(): Promise<void> {
		this.emit(EVENT_AIR_PURIFIER_DEBUG_LOG, "Disconnect from device.");
		if (this.device) {
			await this.device.destroy();
		}
	}

	async connect(): Promise<boolean> {
		this.emit(EVENT_AIR_PURIFIER_DEBUG_LOG, `Connect to device: ${this.ipAddress}`);
		this.device = await miio.device({
			address: this.ipAddress,
			token: this.token
		})
		if (this.device.matches("type:air-purifier")) {
			return true;
		} else {
			return false;
		}
	}

	subscribeToValues(): void {
		this.emit(EVENT_AIR_PURIFIER_DEBUG_LOG,`subscribeToValues`);
		this.device.on("powerChanged", (isOn: any) => this.emit(EVENT_AIR_PURIFIER_POWER, isOn));
		this.device.on("modeChanged", (mode: any) => this.emit(EVENT_AIR_PURIFIER_MODE, mode));
		this.device.on("temperatureChanged", (temp: any) =>
			this.emit(EVENT_AIR_PURIFIER_TEMPERATURE, temp)
		);
		this.device.on("relativeHumidityChanged", (rh: any) =>
			this.emit(EVENT_AIR_PURIFIER_HUMIDITY, rh)
		);
		this.device.on("pm2.5Changed", (pm25: any) => this.emit(EVENT_AIR_PURIFIER_PM25, pm25));
		this.device.on("favoriteLevel", (favoriteLevel: any) =>
			this.emit(EVENT_AIR_PURIFIER_MANUALLEVEL, favoriteLevel)
		);
	}

	checkRegularValues(): void {
		// Power
		this.device
			.power()
			.then((isOn: any) => this.emit(EVENT_AIR_PURIFIER_POWER, isOn))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_POWER} data. Error: ${err}`));
		// Mode
		this.device
			.mode()
			.then((mode: any) => this.emit(EVENT_AIR_PURIFIER_MODE, mode))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_MODE} data. Error: ${err}`));
		// Favorite Level
		this.device
			.favoriteLevel()
			.then((favoriteLevel: any) => this.emit(EVENT_AIR_PURIFIER_MANUALLEVEL, favoriteLevel))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_MANUALLEVEL} data. Error: ${err}`));
	}

	checkInitValues(): void {
		// Power
		this.device
			.power()
			.then((isOn: any) => this.emit(EVENT_AIR_PURIFIER_POWER, isOn))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_POWER} data. Error: ${err}`));
		// Mode
		this.device
			.mode()
			.then((mode: any) => this.emit(EVENT_AIR_PURIFIER_MODE, mode))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_MODE} data. Error: ${err}`));
		// Favorite Level
		this.device
			.favoriteLevel()
			.then((favoriteLevel: any) => this.emit(EVENT_AIR_PURIFIER_MANUALLEVEL, favoriteLevel))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_MANUALLEVEL} data. Error: ${err}`));
		// Temperature
		this.device
			.temperature()
			.then((temp: any) => this.emit(EVENT_AIR_PURIFIER_TEMPERATURE, temp))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_TEMPERATURE} data. Error: ${err}`));
		// Relative Humidity
		this.device
			.relativeHumidity()
			.then((rh: any) => this.emit(EVENT_AIR_PURIFIER_HUMIDITY, rh))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_TEMPERATURE} data. Error: ${err}`));
		// PM 2.5
		this.device
			.pm2_5()
			.then((pm25: any) => this.emit(EVENT_AIR_PURIFIER_PM25, pm25))
			.catch((err: any) => this.emit(EVENT_AIR_PURIFIER_ERROR_LOG, `No ${EVENT_AIR_PURIFIER_TEMPERATURE} data. Error: ${err}`));
	}

	setPower(power: boolean): Promise<boolean> {
		return this.device.power(power)
	}

	async setMode(mode: string | undefined): Promise<boolean> {
		if (
			["auto", "silent", "favorite"].some(possibleMode => possibleMode === mode)
		) {
			const result = await this.device.setMode(mode)
			return result === mode
		}
		return false;
	}

	setFavoriteLevel(favoriteLevel: number): void {
		if (favoriteLevel >= 0 && favoriteLevel <= 16) {
			return this.device.setFavoriteLevel(favoriteLevel)
		}
	}
};