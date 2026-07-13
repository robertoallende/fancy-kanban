export type WorkflowMap = Map<string, Set<string>>;

export function parseWorkflow(workflowString: string | undefined, statusOptions: string[]): WorkflowMap {
	const map: WorkflowMap = new Map();

	if (!workflowString || !workflowString.trim()) {
		for (const from of statusOptions) {
			map.set(from, new Set(statusOptions.filter(s => s !== from)));
		}
		return map;
	}

	for (const pair of workflowString.split(',')) {
		const [from, to] = pair.split('→').map(s => s.trim());
		if (!from || !to) continue;
		if (!map.has(from)) map.set(from, new Set());
		map.get(from)!.add(to);
	}

	return map;
}

export function isTransitionAllowed(map: WorkflowMap, from: string, to: string): boolean {
	if (from === to) return false;
	return map.get(from)?.has(to) ?? false;
}
