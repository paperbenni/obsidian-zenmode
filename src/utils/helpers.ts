/**
 * Helper function to set CSS properties on an element.
 * Converts camelCase property names to kebab-case for CSS.
 */
export function setCssProps(
	element: HTMLElement,
	props: Record<string, string>
): void {
	Object.entries(props).forEach(([key, value]) => {
		const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
		element.style.setProperty(cssKey, value);
	});
}
