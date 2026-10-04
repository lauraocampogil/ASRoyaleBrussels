export const mediaUrl = (u?: string) =>
	u?.replace(/^.*\/assets\/([0-9a-f-]{36}).*$/i, '/media/$1') ?? '';
