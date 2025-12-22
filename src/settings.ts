export interface ZenModeSettings {
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
