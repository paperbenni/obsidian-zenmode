import {
	App,
	ButtonComponent,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

export default class ZenMode extends Plugin {
	settings: ZenModeSettings;
	hasButton: boolean = false;
	private button: ButtonComponent;
	private buttonContainer: HTMLDivElement;

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
				this.toggleZenMode();
			},
		});

		this.addRibbonIcon("expand", "Toggle zen mode", async () => {
			this.toggleZenMode();
		});

		this.refresh();
	}

	onunload() {
		console.log("Unloading zen mode plugin");
		if (this.buttonContainer) {
			this.buttonContainer.remove();
		}
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
		this.setButtonVisibility();
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

	createButton() {
		this.buttonContainer = document.createElement("div");
		this.buttonContainer.classList.add("zenmode-button");

		this.button = new ButtonComponent(this.buttonContainer);
		this.button.setIcon("shrink");
		this.button.onClick(() => {
			this.toggleZenMode();
		});

		document.body.appendChild(this.buttonContainer);
	}

	setButtonVisibility() {
		const shouldShow =
			this.settings.zenMode &&
			(this.settings.exitButtonVisibility === "always" ||
				(this.settings.exitButtonVisibility === "mobile-only" &&
					document.body.classList.contains("is-mobile")));

		if (shouldShow) {
			if (!this.hasButton) {
				this.createButton();
				this.hasButton = true;
			}
			this.buttonContainer.style.display = "block";
		} else {
			if (this.hasButton) {
				this.buttonContainer.style.display = "none";
			}
		}
	}

	async toggleZenMode() {
		const enteringZenMode = !this.settings.zenMode;

		if (enteringZenMode) {
			// Enter zen mode
			this.settings.zenMode = true;
			this.saveData(this.settings);
			this.refresh();

			// Enter fullscreen if setting is enabled
			if (this.settings.fullscreen) {
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
			}
		} else {
			// Exit fullscreen first if active
			if (document.fullscreenElement) {
				try {
					await document.exitFullscreen();
					// Wait for DOM updates to complete
					await new Promise((resolve) =>
						requestAnimationFrame(resolve)
					);
				} catch (e) {
					// Ignore errors
				}
			}
			// Exit zen mode
			this.settings.zenMode = false;
			this.saveData(this.settings);
			this.refresh();
		}
	}
}

interface ZenModeSettings {
	zenMode: boolean;
	leftSidebar: boolean;
	rightSidebar: boolean;
	fullscreen: boolean;
	exitButtonVisibility: "mobile-only" | "always" | "never";
}

const DEFAULT_SETTINGS: ZenModeSettings = {
	zenMode: false,
	leftSidebar: false,
	rightSidebar: false,
	fullscreen: false,
	exitButtonVisibility: "mobile-only",
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
			.setName("Preview zen mode")
			.setDesc("Preview zen mode (use a hotkey to toggle)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.zenMode)
					.onChange((value) => {
						this.plugin.settings.zenMode = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Full screen")
			.setDesc("Automatically enter fullscreen when enabling zen mode")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.fullscreen)
					.onChange((value) => {
						this.plugin.settings.fullscreen = value;
						this.plugin.saveData(this.plugin.settings);
					})
			);

		new Setting(containerEl)
			.setName("Show zen mode exit button")
			.setDesc("When to show the exit button in zen mode")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("mobile-only", "Mobile Only")
					.addOption("always", "Always Show")
					.addOption("never", "Never Show")
					.setValue(this.plugin.settings.exitButtonVisibility)
					.onChange((value: "mobile-only" | "always" | "never") => {
						this.plugin.settings.exitButtonVisibility = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					})
			);
	}
}
