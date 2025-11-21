import {
	App,
	ButtonComponent,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian";

export default class ZenMode extends Plugin {
	settings: ZenModeSettings;
	hasButton: boolean = false;
	private button: ButtonComponent;
	private buttonContainer: HTMLDivElement;
	private _isTogglingZen: boolean = false;
	private visualViewportResizeHandler: (() => void) | null = null;
	private _hasShownInitialHighlight: boolean = false;
	private _highlightTimeouts: number[] = [];

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

		this.addRibbonIcon("expand", "Toggle Zen mode", async () => {
			this.toggleZenMode();
		});

		// Register event listener for active leaf changes (for focused file mode)
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.updateFocusedFileMode();
			})
		);

		// Register ESC key to exit Zen mode
		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Escape" && this.settings.zenMode) {
				// Don't interfere if vim mode is active (vim uses ESC frequently)
				// Check if the event target is within a CodeMirror editor with vim enabled
				const target = evt.target as HTMLElement;
				if (target) {
					const cmEditor = target.closest(".cm-editor");
					if (cmEditor) {
						// Check if vim mode is enabled in Obsidian settings
						const vaultConfig = (this.app.vault as any).config;
						if (vaultConfig && vaultConfig.vimMode === true) {
							// Vim mode is enabled, don't interfere with ESC
							return;
						}
					}
				}
				// Only exit if no modal is open (to avoid interfering with Obsidian modals)
				const activeModal = document.querySelector(".modal");
				if (!activeModal) {
					this.toggleZenMode();
					evt.preventDefault();
				}
			}
		});

		this.refresh();
	}

	onunload() {
		// Clear any pending animation timeouts
		this._highlightTimeouts.forEach((id) => clearTimeout(id));
		if (this.buttonContainer) {
			this.buttonContainer.remove();
		}
		// Clean up visualViewport event listener
		if (this.visualViewportResizeHandler && window.visualViewport) {
			window.visualViewport.removeEventListener(
				"resize",
				this.visualViewportResizeHandler
			);
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
		this.updateFocusedFileMode();
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

		// Set CSS custom properties for padding
		document.documentElement.style.setProperty(
			"--zen-mode-top-padding",
			`${this.settings.topPadding}px`
		);
		document.documentElement.style.setProperty(
			"--zen-mode-bottom-padding",
			`${this.settings.bottomPadding}px`
		);

		// Use class toggle for properties hiding (like Hider plugin)
		// Toggle the class based on setting (only when zen mode is active)
		if (this.settings.zenMode) {
			document.body.classList.toggle(
				"zenmode-hide-properties",
				this.settings.hideProperties
			);
		} else {
			document.body.classList.remove("zenmode-hide-properties");
		}

		if (this.settings.zenMode) {
			document.body.setAttribute(
				"data-zen-hide-inline-title",
				this.settings.hideInlineTitle.toString()
			);
			document.body.setAttribute(
				"data-zen-focused-file",
				this.settings.focusedFileMode.toString()
			);
		} else {
			// Remove data attributes when zen mode is off
			document.body.removeAttribute("data-zen-hide-inline-title");
			document.body.removeAttribute("data-zen-focused-file");
		}
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

		// Adjust button position for mobile navigation bar
		this.adjustButtonPosition();

		// Listen for resize events to adjust position when navigation bar appears/disappears
		this.registerDomEvent(window, "resize", () => {
			this.adjustButtonPosition();
		});

		// Also listen to visualViewport resize for better mobile support
		if (window.visualViewport) {
			this.visualViewportResizeHandler = () => {
				this.adjustButtonPosition();
			};
			window.visualViewport.addEventListener(
				"resize",
				this.visualViewportResizeHandler
			);
		}
	}

	adjustButtonPosition() {
		if (
			!this.buttonContainer ||
			!document.body.classList.contains("is-mobile")
		) {
			return;
		}

		// Calculate safe bottom offset for mobile devices
		// This accounts for Android navigation bars that may not be detected by CSS safe-area-inset
		const viewportHeight =
			window.visualViewport?.height || window.innerHeight;
		const windowHeight = window.outerHeight;
		const navigationBarHeight = Math.max(0, windowHeight - viewportHeight);

		// Use a minimum offset to ensure button is always accessible
		// 60px should be enough to clear most navigation bars
		const minBottomOffset = 60;
		const calculatedOffset = Math.max(
			minBottomOffset,
			navigationBarHeight + 10
		);

		// Apply the offset
		this.buttonContainer.style.bottom = `${calculatedOffset}px`;
	}

	setButtonVisibility() {
		const isMobile = document.body.classList.contains("is-mobile");
		const shouldShow =
			this.settings.zenMode &&
			(this.settings.exitButtonVisibility === "always" ||
				(this.settings.exitButtonVisibility === "mobile-only" &&
					isMobile));

		if (shouldShow) {
			if (!this.hasButton) {
				this.createButton();
				this.hasButton = true;
			}
			this.buttonContainer.style.display = "block";

			// Apply auto-hide class for desktop hover behavior
			// Only applies when exitButtonVisibility is "always" and on desktop
			if (
				this.settings.autoHideButtonOnDesktop &&
				!isMobile &&
				this.settings.exitButtonVisibility === "always"
			) {
				this.buttonContainer.classList.add("zenmode-button-auto-hide");

				// Show initial highlight animation on first entry to Zen mode
				if (!this._hasShownInitialHighlight) {
					this.buttonContainer.classList.add(
						"zenmode-button-initial-highlight"
					);
					this._hasShownInitialHighlight = true;

					// Remove highlight class after animation completes, then fade out
					const timeout1 = window.setTimeout(() => {
						if (this.buttonContainer) {
							this.buttonContainer.classList.remove(
								"zenmode-button-initial-highlight"
							);
							// Small delay before fading out
							const timeout2 = window.setTimeout(() => {
								if (this.buttonContainer) {
									this.buttonContainer.classList.add(
										"zenmode-button-fade-out"
									);
								}
							}, 300);
							this._highlightTimeouts.push(timeout2);
						}
					}, 1500);
					this._highlightTimeouts.push(timeout1);
				}
			} else {
				this.buttonContainer.classList.remove(
					"zenmode-button-auto-hide"
				);
				this.buttonContainer.classList.remove(
					"zenmode-button-initial-highlight"
				);
				this.buttonContainer.classList.remove(
					"zenmode-button-fade-out"
				);
			}

			// Adjust position when button becomes visible
			this.adjustButtonPosition();
		} else {
			if (this.hasButton) {
				this.buttonContainer.style.display = "none";
			}
		}
	}

	// Update focused file mode visibility
	updateFocusedFileMode() {
		if (!this.settings.zenMode || !this.settings.focusedFileMode) {
			// Restore all tab containers when focused file mode is off
			const allTabContainers =
				document.querySelectorAll(".workspace-tabs");
			allTabContainers.forEach((container) => {
				const el = container as HTMLElement;
				el.style.display = "";
				el.style.width = "";
				el.style.flex = "";
			});
			return;
		}

		// Get the active leaf (works for all view types, not just markdown)
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf) return;

		// Find the workspace-tabs container that holds the active leaf
		// Note: containerEl is an internal Obsidian API property, not exposed in public types
		const activeLeafContainer =
			activeLeaf && "containerEl" in activeLeaf
				? (activeLeaf as any).containerEl
				: null;
		if (!activeLeafContainer) return;

		const activeTabContainer =
			activeLeafContainer.closest(".workspace-tabs");
		if (!activeTabContainer) return;

		// Hide all workspace-tabs containers except the one containing the active leaf
		const allTabContainers = document.querySelectorAll(".workspace-tabs");
		allTabContainers.forEach((tabContainer) => {
			if (tabContainer === activeTabContainer) {
				// Show and expand the active tab container
				(tabContainer as HTMLElement).style.display = "";
				(tabContainer as HTMLElement).style.width = "100%";
				(tabContainer as HTMLElement).style.flex = "1 1 100%";
			} else {
				// Hide non-active tab containers
				(tabContainer as HTMLElement).style.display = "none";
			}
		});
	}

	async toggleZenMode() {
		// Guard against concurrent invocations
		if (this._isTogglingZen) {
			return;
		}

		this._isTogglingZen = true;

		try {
			const enteringZenMode = !this.settings.zenMode;

			// Reset highlight flag when exiting Zen mode
			if (!enteringZenMode) {
				this._hasShownInitialHighlight = false;
			}

			if (enteringZenMode) {
				// Enter fullscreen first if setting is enabled
				if (
					this.settings.fullscreen &&
					document.documentElement.requestFullscreen
				) {
					try {
						await document.documentElement.requestFullscreen();
						// Wait for next frame to ensure fullscreen transition is smooth
						await new Promise((resolve) =>
							requestAnimationFrame(resolve)
						);
					} catch (e) {
						// Fullscreen might fail (e.g., user cancelled), continue anyway
						console.warn("Failed to enter fullscreen:", e);
					}
				}

				// Update zen mode state after fullscreen operation completes
				this.settings.zenMode = true;
				await this.saveSettings();
				this.refresh();
			} else {
				// Exit fullscreen first if active
				if (document.fullscreenElement && document.exitFullscreen) {
					try {
						await document.exitFullscreen();
						// Wait for DOM updates to complete
						await new Promise((resolve) =>
							requestAnimationFrame(resolve)
						);
					} catch (e) {
						// Fullscreen exit might fail, continue anyway
						console.warn("Failed to exit fullscreen:", e);
					}
				}

				// Update zen mode state after fullscreen operation completes
				this.settings.zenMode = false;
				await this.saveSettings();
				this.refresh();
			}
		} finally {
			// Always clear the lock, even if an error occurs
			this._isTogglingZen = false;
		}
	}
}

interface ZenModeSettings {
	zenMode: boolean;
	leftSidebar: boolean;
	rightSidebar: boolean;
	fullscreen: boolean;
	exitButtonVisibility: "mobile-only" | "always" | "never";
	autoHideButtonOnDesktop: boolean;
	hideProperties: boolean;
	hideInlineTitle: boolean;
	topPadding: number;
	bottomPadding: number;
	focusedFileMode: boolean;
}

const DEFAULT_SETTINGS: ZenModeSettings = {
	zenMode: false,
	leftSidebar: false,
	rightSidebar: false,
	fullscreen: false,
	exitButtonVisibility: "always",
	autoHideButtonOnDesktop: false,
	hideProperties: false,
	hideInlineTitle: false,
	topPadding: 0,
	bottomPadding: 0,
	focusedFileMode: false,
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
			.setName("Full screen")
			.setDesc("Automatically enter fullscreen when enabling Zen mode.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.fullscreen)
					.onChange((value) => {
						this.plugin.settings.fullscreen = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show Zen mode exit button")
			.setDesc(
				"When to show the exit button in Zen mode. You can also exit via the command palette, by pressing ESC, or by assigning a hotkey to the 'Toggle Zen mode' command."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("always", "Always show")
					.addOption("mobile-only", "Mobile only")
					.addOption("never", "Never show")
					.setValue(this.plugin.settings.exitButtonVisibility)
					.onChange((value: "mobile-only" | "always" | "never") => {
						this.plugin.settings.exitButtonVisibility = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Auto-hide Zen mode exit button on desktop")
			.setDesc(
				"When enabled, the exit button is hidden on desktop but reveals itself on hover as long as the Zen mode exit button is on."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoHideButtonOnDesktop)
					.onChange((value) => {
						this.plugin.settings.autoHideButtonOnDesktop = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Hide properties in Zen mode")
			.setDesc("Hide properties when Zen mode is active.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideProperties)
					.onChange((value) => {
						this.plugin.settings.hideProperties = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Hide inline title in Zen mode")
			.setDesc(
				"Hide the inline title (note title) when Zen mode is active."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideInlineTitle)
					.onChange((value) => {
						this.plugin.settings.hideInlineTitle = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Top padding")
			.setDesc("Top padding in pixels (0-100).")
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.topPadding)
					.setDynamicTooltip()
					.onChange((value) => {
						this.plugin.settings.topPadding = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Bottom padding")
			.setDesc("Bottom padding in pixels (0-100).")
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.bottomPadding)
					.setDynamicTooltip()
					.onChange((value) => {
						this.plugin.settings.bottomPadding = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Focused file mode")
			.setDesc(
				"Only show the active file in Zen mode, hide all other panes."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.focusedFileMode)
					.onChange((value) => {
						this.plugin.settings.focusedFileMode = value;
						this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);
	}
}
