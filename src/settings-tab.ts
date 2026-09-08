import { App, PluginSettingTab, SettingGroup } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";

import type ZenMode from "./main";

/**
 * Settings tab for the Zen Mode plugin.
 * Provides UI for configuring all plugin settings.
 * Implements declarative settings API for Obsidian 1.13.0+ search indexing.
 */
export class ZenModeSettingTab extends PluginSettingTab {
	plugin: ZenMode;
	public icon = "lucide-expand";
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
	 * Declarative settings definitions for Obsidian 1.13.0+
	 * Enables global search indexing of plugin settings.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Full screen",
				desc: "Automatically enter fullscreen when enabling zen mode.",
				control: {
					type: "toggle",
					key: "fullscreen",
				},
			},
			{
				name: "Show zen mode exit button",
				desc: "When to show the exit button in zen mode. You can also exit via the command palette, by pressing esc, or by assigning a hotkey to the 'toggle zen mode' command.",
				control: {
					type: "dropdown",
					key: "exitButtonVisibility",
					options: {
						always: "Always show",
						"mobile-only": "Mobile only",
						never: "Never show",
					},
				},
			},
			{
				name: "Auto-hide zen mode exit button on desktop",
				desc: "When enabled, the exit button is hidden on desktop but reveals itself on hover as long as the zen mode exit button is on.",
				control: {
					type: "toggle",
					key: "autoHideButtonOnDesktop",
				},
			},
			{
				name: "Hide properties in zen mode",
				desc: "Hide properties when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideProperties",
				},
			},
			{
				name: "Hide inline title in zen mode",
				desc: "Hide the inline title (note title) when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideInlineTitle",
				},
			},
			{
				name: "Hide status bar in zen mode",
				desc: "Hide the status bar when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideStatusBar",
				},
			},
			{
				name: "Hide linked mentions in zen mode",
				desc: "Hide linked mentions when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideLinkedMentions",
				},
			},
			{
				name: "Hide scroll bar in zen mode",
				desc: "Hide scroll bar when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideScrollBar",
				},
			},
			{
				name: "Disable spellcheck in zen mode",
				desc: "Hide spellcheck underlines when zen mode is active.",
				control: {
					type: "toggle",
					key: "hideSpellcheck",
				},
			},
			{
				name: "Top padding",
				desc: "Top padding in pixels (0-100).",
				control: {
					type: "slider",
					key: "topPadding",
					min: 0,
					max: 100,
					step: 1,
				},
			},
			{
				name: "Bottom padding",
				desc: "Bottom padding in pixels (0-100).",
				control: {
					type: "slider",
					key: "bottomPadding",
					min: 0,
					max: 100,
					step: 1,
				},
			},
			{
				name: "Focused file mode",
				desc: "Only show the active file in zen mode, hide all other panes.",
				control: {
					type: "toggle",
					key: "focusedFileMode",
				},
			},
		];
	}

	/**
	 * Read settings value for declarative API.
	 */
	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[
			key
		];
	}

	/**
	 * Write settings value for declarative API and refresh UI.
	 */
	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] =
			value;
		await this.plugin.saveSettings();
		this.plugin.refresh();
	}

	/**
	 * Legacy imperative display() for Obsidian <1.13.0 compatibility.
	 * On newer versions the declarative definitions above are used instead.
	 */
	display(): void {
		// For declarative tabs, Obsidian renders automatically.
		// Keep imperative rendering as fallback for older versions.
		// If running on 1.13+, we can delegate to the framework by not manually rendering,
		// but to keep compatibility we still render imperatively when display() is called.
		// Check if the declarative API is expected to handle rendering:
		// We implement both approaches: imperative UI here remains functional.

		const { containerEl } = this;

		containerEl.empty();

		// Use dynamic import of SettingGroup for imperative fallback
		// Import is static at top, but we construct imperatively
		const generalGroup = new SettingGroup(containerEl);

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
				.setName("Hide status bar in zen mode")
				.setDesc("Hide the status bar when zen mode is active.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideStatusBar)
						.onChange((value) => {
							this.plugin.settings.hideStatusBar = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Hide linked mentions in zen mode")
				.setDesc("Hide linked mentions when zen mode is active.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideLinkedMentions)
						.onChange((value) => {
							this.plugin.settings.hideLinkedMentions = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Hide scroll bar in zen mode")
				.setDesc("Hide scroll bar when zen mode is active.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideScrollBar)
						.onChange((value) => {
							this.plugin.settings.hideScrollBar = value;
							void this.plugin.saveSettings();
							this.plugin.refresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName("Disable spellcheck in zen mode")
				.setDesc("Hide spellcheck underlines when zen mode is active.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.hideSpellcheck)
						.onChange((value) => {
							this.plugin.settings.hideSpellcheck = value;
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
