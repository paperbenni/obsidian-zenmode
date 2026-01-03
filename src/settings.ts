/**
 * Settings interface for the Zen Mode plugin.
 */
export interface ZenModeSettings {
	/** Whether zen mode is currently active. */
	zenMode: boolean;
	/** Whether the left sidebar was collapsed before entering zen mode. */
	leftSidebar: boolean;
	/** Whether the right sidebar was collapsed before entering zen mode. */
	rightSidebar: boolean;
	/** Whether to automatically enter fullscreen when enabling zen mode. */
	fullscreen: boolean;
	/** When to show the zen mode exit button. */
	exitButtonVisibility: "mobile-only" | "always" | "never";
	/** Whether to auto-hide the exit button on desktop (reveals on hover). */
	autoHideButtonOnDesktop: boolean;
	/** Whether to hide properties when zen mode is active. */
	hideProperties: boolean;
	/** Whether to hide the inline title (note title) when zen mode is active. */
	hideInlineTitle: boolean;
	/** Top padding in pixels (0-100). */
	topPadding: number;
	/** Bottom padding in pixels (0-100). */
	bottomPadding: number;
	/** Whether to show only the active file, hiding all other panes. */
	focusedFileMode: boolean;
}

/**
 * Default settings for the Zen Mode plugin.
 */
export const DEFAULT_SETTINGS: ZenModeSettings = {
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
