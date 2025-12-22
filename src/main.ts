import { ButtonComponent, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type ZenModeSettings } from "./settings";
import { ZenModeSettingTab } from "./settings-tab";
import { setCssProps } from "./utils/helpers";

export default class ZenMode extends Plugin {
	settings!: ZenModeSettings;
	hasButton: boolean = false;
	private button!: ButtonComponent;
	private buttonContainer!: HTMLDivElement;
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
				void this.toggleZenMode();
			},
		});

		this.addRibbonIcon("expand", "Toggle zen mode", async () => {
			void this.toggleZenMode();
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
						// Note: vault.config is not in public API types, but exists at runtime
						const vault = this.app
							.vault as typeof this.app.vault & {
							config?: { vimMode?: boolean };
						};
						if (vault.config?.vimMode === true) {
							// Vim mode is enabled, don't interfere with ESC
							return;
						}
					}
				}
				// Only exit if no modal is open (to avoid interfering with Obsidian modals)
				const activeModal = document.querySelector(".modal");
				if (!activeModal) {
					void this.toggleZenMode();
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
		const loadedData =
			(await this.loadData()) as Partial<ZenModeSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...loadedData };
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
			void this.toggleZenMode();
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
		setCssProps(this.buttonContainer, { bottom: `${calculatedOffset}px` });
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
			this.buttonContainer.classList.add("zenmode-button-visible");

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
				this.buttonContainer.classList.remove("zenmode-button-visible");
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
				el.classList.remove("zenmode-tab-hidden");
				el.classList.remove("zenmode-tab-active");
				// Clear any inline styles to restore default state
				setCssProps(el, { display: "", width: "", flex: "" });
			});
			return;
		}

		// Get the active leaf using recommended API
		// Use getLeaf(false) to get the active leaf without creating a new one
		const activeLeaf = this.app.workspace.getLeaf(false);
		if (!activeLeaf) return;

		// Find the workspace-tabs container that holds the active leaf
		// Note: containerEl is an internal Obsidian API property, not exposed in public types
		interface WorkspaceLeafWithContainer {
			containerEl?: HTMLElement;
		}
		const activeLeafWithContainer =
			activeLeaf as WorkspaceLeafWithContainer;
		const activeLeafContainer = activeLeafWithContainer.containerEl ?? null;
		if (!activeLeafContainer) return;

		const activeTabContainer =
			activeLeafContainer.closest(".workspace-tabs");
		if (!activeTabContainer || !(activeTabContainer instanceof HTMLElement))
			return;

		// Hide all workspace-tabs containers except the one containing the active leaf
		const allTabContainers = document.querySelectorAll(".workspace-tabs");
		allTabContainers.forEach((tabContainer) => {
			const el = tabContainer as HTMLElement;
			if (tabContainer === activeTabContainer) {
				// Show and expand the active tab container
				el.classList.remove("zenmode-tab-hidden");
				setCssProps(el, {
					display: "",
					width: "100%",
					flex: "1 1 100%",
				});
			} else {
				// Hide non-active tab containers
				el.classList.add("zenmode-tab-hidden");
				setCssProps(el, { display: "none" });
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
