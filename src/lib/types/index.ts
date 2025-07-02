export type Banner = {
	id: string;
	type: string;
	title?: string;
	content: string;
	url?: string;
	dismissible?: boolean;
	timestamp: number;
};

export enum TTS_RESPONSE_SPLIT {
	PUNCTUATION = 'punctuation',
	PARAGRAPHS = 'paragraphs',
	NONE = 'none'
}

export type KnowledgeBase = {
	id: string;
	name: string;
	description: string;
	user?: {
		id: string;
		name?: string;
		email?: string;
	};
	data?: {
		status: 'In Progress' | 'Completed' | 'Error';
	};
	updated_at: number;
};
