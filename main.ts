import {
  App,
  ButtonComponent,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

export default class ZenMode extends Plugin {
  settings: ZenModeSettings;
  hasButton: boolean;
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
        this.settings.zenMode = !this.settings.zenMode;
        this.saveData(this.settings);
        this.refresh();
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

  createButton() {
    this.buttonContainer = document.createElement("div");
    this.buttonContainer.classList.add("zenmode-button");

    this.button = new ButtonComponent(this.buttonContainer);
    this.button.setIcon("shrink");
    this.button.onClick(() => {
      this.settings.zenMode = !this.settings.zenMode;
      this.saveSettings();
      this.refresh();
    });

    document.body.appendChild(this.buttonContainer);
  }

  setButtonVisibility() {
    if (this.settings.zenMode) {
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
      this.settings.rightSidebar = this.app.workspace.rightSplit.collapsed;
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
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Enable Zen Mode")
      .setDesc("Hide most UI elements")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.zenMode).onChange((value) => {
          this.plugin.settings.zenMode = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.refresh();
        })
      );
  }
}
