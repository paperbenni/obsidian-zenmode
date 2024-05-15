import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class ZenMode extends Plugin {
  settings: ZenModeSettings;

  async onload() {
    // load settings
    await this.loadSettings();

    // add the settings tab
    this.addSettingTab(new ZenModeSettingTab(this.app, this));
    // add the toggle on/off command

    this.addCommand({
      id: 'toggle-zen-mode',
      name: 'Toggle Zen Mode',
      callback: () => {
        this.settings.zenMode = !this.settings.zenMode;
        this.saveData(this.settings);
        this.refresh();
      }
    });

    this.refresh()
  }

  onunload() {
    console.log('Unloading Zen Mode plugin');
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
    this.updateStyle()
  }

  // update the styles (at the start, or as the result of a settings change)
  updateStyle = () => {
    document.body.classList.toggle('zenmode-active', this.settings.zenMode);
  }

}

interface ZenModeSettings {
  zenMode: boolean;
}
const DEFAULT_SETTINGS: ZenModeSettings = {
  zenMode: false
}

class ZenModeSettingTab extends PluginSettingTab {

  plugin: ZenMode;
  constructor(app: App, plugin: ZenMode) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let {containerEl} = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Enable Zen Mode')
      .setDesc('Hides most UI Elements')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.zenMode)
          .onChange((value) => {
            this.plugin.settings.zenMode = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
            })
          );


  }
}