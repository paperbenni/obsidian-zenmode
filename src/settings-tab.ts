import { App, PluginSettingTab } from "obsidian";
import { createSettingsGroup } from "./utils/settings-compat";
import type ZenMode from "./main";

/**
 * Settings tab for the Zen Mode plugin.
 * Provides UI for configuring all plugin settings.
 */
export class ZenModeSettingTab extends PluginSettingTab {
	plugin: ZenMode;
	/**
	 * Creates a new settings tab instance.
	 * @param app - The Obsidian app instance
	 * @param plugin - The Zen Mode plugin instance
	 */
	constructor(app: App, plugin: ZenMode) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Displays the settings tab UI.
	 * Creates all setting controls and registers change handlers.
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Create settings group (no heading - all settings are general)
		const generalGroup = createSettingsGroup(
			containerEl,
			undefined,
			"zenmode"
		);

		generalGroup.addSetting((setting) => {
			setting
				.setName("Full screen")
				.setDesc(
					"Automatically enter fullscreen when enabling zen mode."
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.fullscreen)
						.onChange((value) => {
							this.plugin.settings.fullscreen = value;
							void this.plugin.saveSettings();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Show zen mode exit button")
				.setDesc(
					"When to show the exit button in zen mode. You can also exit via the command palette, by pressing esc, or by assigning a hotkey to the 'toggle zen mode' command."
				)
				.addDropdown((dropdown) =>
					dropdown
						.addOption("always", "Always show")
						.addOption("mobile-only", "Mobile only")
						.addOption("never", "Never show")
						.setValue(this.plugin.settings.exitButtonVisibility)
						.onChange((value: string) => {
							this.plugin.settings.exitButtonVisibility =
								value as "mobile-only" | "always" | "never";
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Auto-hide zen mode exit button on desktop")
				.setDesc(
					"When enabled, the exit button is hidden on desktop but reveals itself on hover as long as the zen mode exit button is on."
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.autoHideButtonOnDesktop)
						.onChange((value) => {
							this.plugin.settings.autoHideButtonOnDesktop =
								value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Hide properties in zen mode")
				.setDesc("Hide properties when zen mode is active.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideProperties)
						.onChange((value) => {
							this.plugin.settings.hideProperties = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Hide inline title in zen mode")
				.setDesc(
					"Hide the inline title (note title) when zen mode is active."
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideInlineTitle)
						.onChange((value) => {
							this.plugin.settings.hideInlineTitle = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Top padding")
				.setDesc("Top padding in pixels (0-100).")
				.addSlider((slider) =>
					slider
						.setLimits(0, 100, 1)
						.setValue(this.plugin.settings.topPadding)
						.setDynamicTooltip()
						.onChange((value) => {
							this.plugin.settings.topPadding = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Bottom padding")
				.setDesc("Bottom padding in pixels (0-100).")
				.addSlider((slider) =>
					slider
						.setLimits(0, 100, 1)
						.setValue(this.plugin.settings.bottomPadding)
						.setDynamicTooltip()
						.onChange((value) => {
							this.plugin.settings.bottomPadding = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Focused file mode")
				.setDesc(
					"Only show the active file in zen mode, hide all other panes."
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.focusedFileMode)
						.onChange((value) => {
							this.plugin.settings.focusedFileMode = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});
	}
}
