export const RULES = [
	{
		id: 'prefer-create-el',
		pattern: /\b(active)?[Dd]ocument\.createElement\b/,
		message: 'Use createEl() instead of document.createElement() or activeDocument.createElement()',
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
	{
		id: 'vault-enumeration',
		pattern: /vault\.(getFiles|getMarkdownFiles)\(/,
		message: 'Vault enumeration detected — document usage intent in Obsidian submission notes',
		warn: true,
	},
];

export const CSS_RULES = [
	{
		id: 'no-important',
		pattern: /!important/,
		message: 'Avoid !important — increase selector specificity instead',
	},
];
