import { WEBUI_API_BASE_URL } from '$lib/constants';

export const createNewKnowledge = async (
	token: string,
	name: string,
	description: string,
	question_column_name: string,
	answer_column_name: string,
	file: File,
	accessControl: null | object
) => {

	const formData = new FormData();
	formData.append('name', name);
	formData.append('description', description);
	formData.append('question_column_name', question_column_name);
	formData.append('answer_column_name', answer_column_name);
	formData.append('file', file);
	if (accessControl !== null) {
		// @ts-ignore
		formData.append('access_control', accessControl);
	}

	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/create`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`
		},
		body: formData
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getKnowledgeBases = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getKnowledgeBaseList = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/list`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getKnowledgeById = async (token: string, id: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type KnowledgeUpdateForm = {
	name?: string;
	description?: string;
	data?: object;
	access_control?: null | object;
};

export const updateKnowledgeById = async (token: string, id: string, form: KnowledgeUpdateForm) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			name: form?.name ? form.name : undefined,
			description: form?.description ? form.description : undefined,
			data: form?.data ? form.data : undefined,
			access_control: form.access_control
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const addFileToKnowledgeById = async (token: string, id: string, fileId: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/file/add`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			file_id: fileId
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateFileFromKnowledgeById = async (token: string, id: string, fileId: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/file/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			file_id: fileId
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const removeFileFromKnowledgeById = async (token: string, id: string, fileId: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/file/remove`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			file_id: fileId
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const resetKnowledgeById = async (token: string, id: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/reset`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const deleteKnowledgeById = async (token: string, id: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/knowledge/${id}/delete`, {
		method: 'DELETE',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.then((json) => {
			return json;
		})
		.catch((err) => {
			error = err.detail;

			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const downloadAdapter = async (
	token: string,
	userId: string,
	knowledgeId: string
) => {
	/*
	 * Download adapter for a given knowledge base and user.
	 * The backend returns a zip file in the response body.
	 * It is streamed with the following headers:
	 *   content-disposition: attachment; filename=adapter.zip
	 *   content-type: application/x-zip-compressed
	 * The function saves the file to the client using a temporary anchor element.
	 */

	let error: unknown | null = null;

	try {
		const url = `${WEBUI_API_BASE_URL}/knowledge/adapter/download?user_id=${userId}&knowledge_id=${knowledgeId}`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			// Attempt to parse error message from json
			let err: any = await response.text();
			try {
				err = JSON.parse(err);
			} catch (_) {
				/* ignore */
			}
			throw err;
		}

		const blob = await response.blob();

		// Infer filename from content-disposition header if present
		let filename = 'adapter.zip';
		const contentDisposition = response.headers.get('content-disposition');
		if (contentDisposition) {
			const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition);
			if (match) {
				filename = decodeURIComponent(match[1] || match[2]);
			}
		}

		const blobUrl = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		window.URL.revokeObjectURL(blobUrl);

		return true;
	} catch (err) {
		error = err;
	}

	if (error) {
		throw error;
	}
};

export async function stopKnowledgeTraining(token: string, userId: string, knowledgeId: string) {
	const formData = new FormData();
	formData.append('user_id', userId);
	formData.append('knowledge_id', knowledgeId);

	const response = await fetch(`${WEBUI_API_BASE_URL}/knowledge/fine-tune/stop`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`
		},
		body: formData
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(error);
	}

	return response.ok;
}
