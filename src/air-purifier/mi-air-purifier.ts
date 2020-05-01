import { EventEmitter } from "events";
import * as miio from "miio";
import { EVENT_AIR_PURIFIER_DEBUG_LOG, EVENT_AIR_PURIFIER_POWER, EVENT_AIR_PURIFIER_MODE, EVENT_AIR_PURIFIER_TEMPERATURE, EVENT_AIR_PURIFIER_HUMIDITY, EVENT_AIR_PURIFIER_MANUALLEVEL, EVENT_AIR_PURIFIER_PM25, EVENT_AIR_PURIFIER_BUZZER, EVENT_AIR_PURIFIER_LED, EVENT_AIR_PURIFIER_FILTER_REMAINING, EVENT_AIR_PURIFIER_FILTER_USED } from "./mi-air-purifier-constants";

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
		this.emit(EVENT_AIR_PURIFIER_DEBUG_LOG, "subscribeToValues");
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

	async checkValues(): Promise<void> {		
		if (!!this.emit && typeof this.emit === "function") {
			this.emit(EVENT_AIR_PURIFIER_DEBUG_LOG, "checkValues");

			const miioProperties = this.device.miioProperties()

			this.emit(EVENT_AIR_PURIFIER_POWER, miioProperties.power)
			this.emit(EVENT_AIR_PURIFIER_MODE, miioProperties.mode)
			this.emit(EVENT_AIR_PURIFIER_MANUALLEVEL, miioProperties.favoriteLevel)
			this.emit(EVENT_AIR_PURIFIER_TEMPERATURE, miioProperties.temperature)
			this.emit(EVENT_AIR_PURIFIER_HUMIDITY, miioProperties.humidity)
			this.emit(EVENT_AIR_PURIFIER_PM25, miioProperties.aqi)
			this.emit(EVENT_AIR_PURIFIER_BUZZER, miioProperties.buzzer)
			this.emit(EVENT_AIR_PURIFIER_LED, miioProperties.led)
			this.emit(EVENT_AIR_PURIFIER_FILTER_REMAINING, miioProperties.filterLifeRemaining)
			this.emit(EVENT_AIR_PURIFIER_FILTER_USED, miioProperties.filterHoursUsed)
		}
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

	setBuzzer(buzzer: boolean): Promise<boolean> | void {
		if (!!this.device.buzzer && typeof this.device.buzzer === "function") {
			return this.device.buzzer(buzzer)
		}
	}

	setLed(led: boolean): Promise<boolean> | void {
		if (!!this.device.led && typeof this.device.led === "function") {
			return this.device.led(led)
		}
	}
};