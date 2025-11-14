import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export default class ZenMode extends Plugin {
	settings: ZenModeSettings;

	async onload() {
		// load settings
		await this.loadSettings();

		// add the settings tab
		this.addSettingTab(new ZenModeSettingTab(this.app, this));
		// add the toggle on/off command

		this.addCommand({
			id: "toggle-zen-mode",
			name: "Toggle",
			callback: () => {
				this.settings.zenMode = !this.settings.zenMode;
				this.saveData(this.settings);
				this.refresh();
			},
		});

		this.addCommand({
			id: "toggle-zen-mode-fullscreen",
			name: "Toggle Zen Mode with Fullscreen",
			callback: () => {
				this.toggleZenModeWithFullscreen();
			},
		});

		this.addRibbonIcon("expand", "Toggle Zen Mode", async () => {
			this.settings.zenMode = !this.settings.zenMode;
			this.saveData(this.settings);
			this.refresh();
		});

		this.refresh();
	}

	onunload() {
		console.log("Unloading Zen Mode plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// refresh function for when we change settings
	refresh = () => {
		// re-load the style
		this.updateStyle();
		this.setSidebarVisibility();
	};

	setSidebarVisibility() {
		//collapse sidebars if zen mode is active
		const app = this.app;

		if (
			app.workspace.leftSplit == undefined ||
			app.workspace.rightSplit == undefined
		) {
			return;
		}

		if (!this.settings.zenMode) {
			if (!this.settings.leftSidebar) {
				app.workspace.leftSplit.expand();
			}
			if (!this.settings.rightSidebar) {
				app.workspace.rightSplit.expand();
			}
		} else {
			this.settings.rightSidebar =
				this.app.workspace.rightSplit.collapsed;
			this.settings.leftSidebar = this.app.workspace.leftSplit.collapsed;

			if (app.workspace.leftSplit.collapsed != this.settings.zenMode) {
				app.workspace.leftSplit.collapse();
			}

			if (app.workspace.rightSplit.collapsed != this.settings.zenMode) {
				app.workspace.rightSplit.collapse();
			}
		}
	}

	// update the styles (at the start, or as the result of a settings change)
	updateStyle = () => {
		document.body.classList.toggle("zenmode-active", this.settings.zenMode);
	};

	async toggleZenModeWithFullscreen() {
		const enteringZenMode = !this.settings.zenMode;

		if (enteringZenMode) {
			// Enter fullscreen first, then update zen mode
			if (document.documentElement.requestFullscreen) {
				try {
					await document.documentElement.requestFullscreen();
					// Wait for next frame to ensure fullscreen transition is smooth
					await new Promise((resolve) =>
						requestAnimationFrame(resolve)
					);
				} catch (e) {
					// Fullscreen might fail (e.g., user cancelled), continue anyway
				}
			}
			// Now update zen mode after fullscreen is active
			this.settings.zenMode = true;
			this.saveData(this.settings);
			this.refresh();
		} else {
			// Exit zen mode first
			this.settings.zenMode = false;
			this.saveData(this.settings);
			this.refresh();
			// Wait for DOM updates to complete
			await new Promise((resolve) => requestAnimationFrame(resolve));
			// Then exit fullscreen
			if (document.fullscreenElement) {
				try {
					await document.exitFullscreen();
				} catch (e) {
					// Ignore errors
				}
			}
		}
	}
}

interface ZenModeSettings {
	zenMode: boolean;
	leftSidebar: boolean;
	rightSidebar: boolean;
}

const DEFAULT_SETTINGS: ZenModeSettings = {
	zenMode: false,
	leftSidebar: false,
	rightSidebar: false,
};

class ZenModeSettingTab extends PluginSettingTab {
	plugin: ZenMode;
	constructor(app: App, plugin: ZenMode) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable Zen Mode")
			.setDesc("Hide most UI elements")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.zenMode)
					.onChange((value) => {
						this.plugin.settings.zenMode = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					})
			);
	}
}
