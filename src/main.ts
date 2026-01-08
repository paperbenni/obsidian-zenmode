import { ButtonComponent, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, type ZenModeSettings } from "./settings";
import { ZenModeSettingTab } from "./settings-tab";
import { setCssProps } from "./utils/helpers";

/**
 * Zen Mode plugin for Obsidian.
 * Hides most UI elements to enable focused content consumption and presentations.
 * Provides a "zen mode" that hides all UI elements except the current text file or document,
 * leaving only a single button to restore all UI. On desktop, it also collapses and restores
 * sidebars when toggled, allowing quick switching from an editing-friendly experience to
 * a viewing-friendly experience.
 */
export default class ZenMode extends Plugin {
	settings!: ZenModeSettings; // Safe: always initialized in onload
	hasButton: boolean = false;
	private button?: ButtonComponent;
	private buttonContainer?: HTMLDivElement;
	private _isTogglingZen: boolean = false;
	private visualViewportResizeHandler: (() => void) | null = null;
	private _hasShownInitialHighlight: boolean = false;
	private _highlightTimeouts: number[] = [];

	/**
	 * Called when the plugin is loaded.
	 * Initializes settings, registers commands, ribbon icon, and event handlers.
	 */
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

		this.addRibbonIcon("expand", "Toggle zen mode", () => {
			void this.toggleZenMode();
		});

		// Register event listener for active leaf changes (for focused file mode)
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				void this.updateFocusedFileMode();
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

					// Don't exit compact mode with escape in an excalidraw textboxes as they use the escape hotkey to leave out of itself.
					// The resulting behaviour is very confusing. (Textbox is still focus but the zenmode disables)
					if (
						target instanceof HTMLTextAreaElement &&
						target.className &&
						target.className.includes("excalidraw")
					) {
						return;
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

	/**
	 * Called when the plugin is unloaded.
	 * Cleans up event listeners, timeouts, and removes the exit button.
	 */
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

	/**
	 * Loads settings from disk, merging with default settings.
	 */
	async loadSettings() {
		const loadedData =
			(await this.loadData()) as Partial<ZenModeSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...loadedData };
	}

	/**
	 * Saves current settings to disk.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Refreshes the plugin state after settings changes.
	 * Updates styles, sidebar visibility, button visibility, and focused file mode.
	 */
	refresh = () => {
		// re-load the style
		this.updateStyle();
		this.setSidebarVisibility();
		this.setButtonVisibility();
		void this.updateFocusedFileMode();
	};

	/**
	 * Manages sidebar visibility based on zen mode state.
	 * When entering zen mode, saves current sidebar state and collapses sidebars.
	 * When exiting zen mode, restores sidebars to their previous state.
	 */
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

	/**
	 * Updates CSS classes and data attributes based on current zen mode settings.
	 * Applies zen mode styling, padding, and feature flags to the document body.
	 */
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

	/**
	 * Creates the zen mode exit button and registers event listeners for positioning.
	 * The button allows users to exit zen mode and adjusts position for mobile navigation bars.
	 */
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

	/**
	 * Adjusts the exit button position on mobile devices to account for navigation bars.
	 * Calculates safe bottom offset using visual viewport API to handle Android navigation bars
	 * that may not be detected by CSS safe-area-inset.
	 */
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

	/**
	 * Controls the visibility of the zen mode exit button based on settings.
	 * Handles button creation, auto-hide behavior on desktop, and initial highlight animation.
	 */
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
			this.buttonContainer!.classList.add("zenmode-button-visible");

			// Apply auto-hide class for desktop hover behavior
			// Only applies when exitButtonVisibility is "always" and on desktop
			if (
				this.settings.autoHideButtonOnDesktop &&
				!isMobile &&
				this.settings.exitButtonVisibility === "always"
			) {
				this.buttonContainer!.classList.add("zenmode-button-auto-hide");

				// Show initial highlight animation on first entry to Zen mode
				if (!this._hasShownInitialHighlight) {
					this.buttonContainer!.classList.add(
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
				this.buttonContainer!.classList.remove(
					"zenmode-button-auto-hide"
				);
				this.buttonContainer!.classList.remove(
					"zenmode-button-initial-highlight"
				);
				this.buttonContainer!.classList.remove(
					"zenmode-button-fade-out"
				);
			}

			// Adjust position when button becomes visible
			this.adjustButtonPosition();
		} else {
			if (this.hasButton) {
				this.buttonContainer!.classList.remove(
					"zenmode-button-visible"
				);
			}
		}
	}

	/**
	 * Helper function to get the tab container from a workspace leaf.
	 * Returns null if the leaf doesn't have a valid container or tab container.
	 */
	private getTabContainerFromLeaf(
		leaf: WorkspaceLeaf | null
	): HTMLElement | null {
		if (!leaf) return null;

		// Find the workspace-tabs container that holds the leaf
		// Note: containerEl is an internal Obsidian API property, not exposed in public types
		interface WorkspaceLeafWithContainer {
			containerEl?: HTMLElement;
		}
		const leafWithContainer = leaf as WorkspaceLeafWithContainer;
		const leafContainer = leafWithContainer.containerEl ?? null;
		if (!leafContainer) return null;

		const tabContainer = leafContainer.closest(".workspace-tabs");
		if (!tabContainer || !(tabContainer instanceof HTMLElement))
			return null;

		return tabContainer;
	}

	/**
	 * Finds and reveals a pinned tab if one exists.
	 * This should be called BEFORE entering zen mode to prevent new tabs from being created.
	 */
	private async revealPinnedTabIfExists(): Promise<void> {
		try {
			// Use Obsidian API to find pinned leaves
			// Check all markdown leaves and see if any are pinned
			const markdownLeaves =
				this.app.workspace.getLeavesOfType("markdown");

			// Check each leaf to see if it's pinned
			// Pinned state might be in the view state or leaf properties
			for (const leaf of markdownLeaves) {
				interface WorkspaceLeafWithPinned {
					pinned?: boolean;
					view?: {
						getState?: () => { pinned?: boolean };
					};
				}
				const leafWithPinned = leaf as WorkspaceLeafWithPinned;

				// Try multiple ways to check if leaf is pinned
				let isPinned = false;
				if (leafWithPinned.pinned === true) {
					isPinned = true;
				} else if (leafWithPinned.view?.getState) {
					const state = leafWithPinned.view.getState();
					if ((state as { pinned?: boolean }).pinned === true) {
						isPinned = true;
					}
				}

				// Also check the DOM for pinned indicator on this leaf's container
				interface WorkspaceLeafWithContainer {
					containerEl?: HTMLElement;
				}
				const leafWithContainer = leaf as WorkspaceLeafWithContainer;
				if (leafWithContainer.containerEl) {
					const tabHeader =
						leafWithContainer.containerEl.querySelector(
							".workspace-tab-header"
						);
					if (tabHeader && tabHeader instanceof HTMLElement) {
						// Check if tab has pinned class or attribute
						if (
							tabHeader.classList.contains("is-pinned") ||
							tabHeader.hasAttribute("data-pinned")
						) {
							isPinned = true;
						}
					}
				}

				if (isPinned) {
					// Explicitly reveal this leaf to make it active
					void this.app.workspace.revealLeaf(leaf);
					// Wait for the reveal to take effect using requestAnimationFrame for better timing
					await new Promise<void>((resolve) => {
						requestAnimationFrame(() => {
							requestAnimationFrame(() => resolve());
						});
					});
					return;
				}
			}
		} catch {
			// Silently handle errors
		}
	}

	/**
	 * Helper function to find the active tab container by checking the DOM.
	 * Looks for tabs with the 'is-active' class or visible active tab headers.
	 */
	private findActiveTabContainerFromDOM(): HTMLElement | null {
		// Try to find an active tab header
		const activeTabHeader = document.querySelector(
			".workspace-tab-header.is-active"
		);
		if (activeTabHeader) {
			const tabContainer = activeTabHeader.closest(".workspace-tabs");
			if (tabContainer && tabContainer instanceof HTMLElement) {
				return tabContainer;
			}
		}

		// Fallback: find any visible tab container (prefer the first one)
		// This handles edge cases where no tab is marked as active
		const allTabContainers = Array.from(
			document.querySelectorAll(".workspace-tabs")
		);
		for (const container of allTabContainers) {
			const el = container as HTMLElement;
			// Check if the container is visible (not already hidden)
			if (
				el.offsetParent !== null &&
				!el.classList.contains("zenmode-tab-hidden")
			) {
				return el;
			}
		}

		return null;
	}

	/**
	 * Updates focused file mode visibility.
	 * When enabled, hides all workspace tab containers except the one containing the active leaf,
	 * showing only the currently focused file. When disabled, restores all tab containers.
	 * Uses multiple fallback methods to handle pinned tabs and edge cases.
	 */
	async updateFocusedFileMode() {
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

		// CRITICAL: Before calling getLeaf(false), check for pinned tabs and reveal them
		// This prevents getLeaf(false) from creating a new tab
		await this.revealPinnedTabIfExists();

		const allTabContainers = Array.from(
			document.querySelectorAll(".workspace-tabs")
		);

		// Try multiple methods to find the active tab container
		let activeTabContainer: HTMLElement | null = null;

		// Method 0: PRIORITY - Check ALL containers for pinned tabs FIRST
		// If a pinned tab exists, we MUST use its container, not the "active" one
		for (const container of allTabContainers) {
			const el = container as HTMLElement;
			// Check all tab headers in this container for pinned state
			// Use STRICT checks only - class "is-pinned" or data-pinned="true" attribute
			const pinnedTabs = Array.from(
				el.querySelectorAll(
					".workspace-tab-header.is-pinned, .workspace-tab-header[data-pinned='true']"
				)
			);

			if (pinnedTabs.length > 0) {
				activeTabContainer = el;
				break;
			}
		}

		// Method 1: Use getMostRecentLeaf() for non-pinned tabs (safer than getLeaf(false))
		// This avoids creating new tabs while still finding the active tab
		if (!activeTabContainer) {
			const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
			if (mostRecentLeaf) {
				activeTabContainer =
					this.getTabContainerFromLeaf(mostRecentLeaf);
			}
		}

		// Method 1b: Fallback to DOM-based detection if getMostRecentLeaf() failed
		if (!activeTabContainer) {
			const activeTabFromDOM = this.findActiveTabContainerFromDOM();
			if (activeTabFromDOM) {
				activeTabContainer = activeTabFromDOM;
			}
		}

		// If we still can't find a valid tab container, give up
		if (!activeTabContainer) {
			return;
		}

		// Hide all workspace-tabs containers except the one containing the active leaf
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

	/**
	 * Toggles zen mode on or off.
	 * Handles fullscreen entry/exit if enabled, updates settings, and refreshes the UI.
	 * Includes guard against concurrent invocations to prevent race conditions.
	 */
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
				// CRITICAL: If focused file mode is enabled, find and reveal pinned tab BEFORE anything else
				// This prevents Obsidian from creating a new tab when getLeaf(false) is called
				if (this.settings.focusedFileMode) {
					await this.revealPinnedTabIfExists();
				}

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
					} catch {
						// Fullscreen might fail (e.g., user cancelled), continue anyway
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
					} catch {
						// Fullscreen exit might fail, continue anyway
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
