export const RULES = [
	{
		id: 'prefer-create-el',
		pattern: /\bdocument\.createElement\b/,
		message: 'Use createEl() instead of document.createElement()',
	},
	{
		id: 'prefer-active-doc',
		// Match `document.` accesses that are NOT `activeDocument`
		pattern: /(?<![.\w])document\.(querySelector|querySelectorAll|getElementById|body|head|createElement)\b/,
		message: 'Use activeDocument instead of document',
	},
	{
		id: 'no-static-styles-assignment',
		// el.style.someProperty = ... (direct property assignment on .style)
		pattern: /\.style\.[a-zA-Z]+\s*=/,
		message: 'Avoid direct .style property assignment; use CSS classes instead',
	},
	{
		id: 'no-unnecessary-type-assertion',
		// Narrowed: only flag `) as ObsidianType`
		pattern: /\) as (App|Workspace|Vault|TFile|TFolder|Plugin)\b/,
		message: 'Avoid unnecessary type assertion; use proper typing instead',
	},
];
