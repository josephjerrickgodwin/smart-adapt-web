<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	const i18n = getContext<Readable<any>>('i18n');

	import { createNewKnowledge, getKnowledgeBases } from '$lib/apis/knowledge';
	import { toast } from 'svelte-sonner';
	import { knowledge } from '$lib/stores';
	import FileItem from '$lib/components/common/FileItem.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	let loading = false;

	let name = '';
	let description = '';
	let question_field_name = '';
	let answer_field_name = '';
	let accessControl: any = null;
	let dropzone: HTMLDivElement;
	let file: (File & { url?: string }) | null = null;
	let acknowledged = false;
	const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
	const NAME_CHAR_LIMIT = 20;
	const DESCRIPTION_CHAR_LIMIT = 50;
	const acceptedTypes = [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"text/csv",
		"application/json",
	];

	// Preview state
	let previewLoading = false;
	let previewRows: string[][] | null = null; // For CSV-like previews; null when none
	let columns: string[] = []; // column names extracted from dataset

	// Function to truncate to character limit
	function truncateToCharLimit(str: string, limit: number): string {
		return str.slice(0, limit);
	}

	// Reactive statements to enforce character limits
	$: if (name && name.length > NAME_CHAR_LIMIT) {
		name = truncateToCharLimit(name, NAME_CHAR_LIMIT);
	}

	$: if (description && description.length > DESCRIPTION_CHAR_LIMIT) {
		description = truncateToCharLimit(description, DESCRIPTION_CHAR_LIMIT);
	}

	$: nameCharCount = name.length;
	$: descriptionCharCount = description.length;

	async function generatePreview(f: File) {
		previewLoading = true;
		previewRows = null;
		columns = [];
		try {
			if (f.type === 'text/csv' || f.name.endsWith('.csv')) {
				const text = await f.text();
				const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

				const parseCSVLine = (line: string): string[] => {
					const cells = [] as string[];
					let cell = '';
					let inQuotes = false;
					for (let i = 0; i < line.length; i++) {
						const char = line[i];
						if (char === '"') {
							// Toggle quote status unless escaped
							if (i < line.length - 1 && line[i + 1] === '"') {
								cell += '"';
								i++; // skip next quote
							} else {
								inQuotes = !inQuotes;
							}
						} else if (char === ',' && !inQuotes) {
							cells.push(cell.trim());
							cell = '';
						} else {
							cell += char;
						}
					}
					cells.push(cell.trim());
					return cells;
				};

				const header = parseCSVLine(lines[0]);
				previewRows = [header];
				columns = header;
				let rowCount = 0;
				for (let i = 1; i < lines.length && rowCount < 5; i++) {
					const row = parseCSVLine(lines[i]);
					if (row.length === header.length) {
						previewRows.push(row);
						rowCount++;
					}
				}
			} else if (f.type === 'application/json' || f.name.endsWith('.json') || f.name.endsWith('.jsonl')) {
				const text = await f.text();
				if (f.name.endsWith('.jsonl')) {
					const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 5);
					previewRows = [['JSONL']].concat(lines.map((l) => [l]));
					columns = ['JSONL'];
				} else {
					const json = JSON.parse(text);
					let rowsArr: any[] = [];
					if (Array.isArray(json)) {
						rowsArr = json.slice(0, 5);
					} else if (typeof json === 'object') {
						rowsArr = [json];
					}

					if (rowsArr.length > 0) {
						const header = Object.keys(rowsArr[0]);
						previewRows = [header];
						columns = header;
						for (const obj of rowsArr) {
							const row = header.map((h) => {
								const val = obj[h];
								return typeof val === 'object' ? JSON.stringify(val) : String(val);
							});
							previewRows.push(row);
							if (previewRows.length >= 6) break;
						}
					} else {
						previewRows = [['(empty json)']];
					}
				}
			} else if (f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || f.name.endsWith('.xlsx')) {
				try {
					// @ts-ignore dynamic import without types
					const xlsx: any = await import('xlsx');
					const data = await f.arrayBuffer();
					const workbook = xlsx.read(data, { type: 'array' });
					const sheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[sheetName];
					const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as unknown as string[][];
					if (rows.length > 0) {
						const header = rows[0] as string[];
						previewRows = [header];
						columns = header;
						for (let i = 1; i < rows.length && i <= 5; i++) {
							previewRows.push((rows[i] as string[]) ?? []);
						}
					} else {
						previewRows = [['(empty sheet)']];
					}
				} catch (e) {
					previewRows = [[`Failed to parse Excel: ${e}`]];
				}
			} else {
				previewRows = [['Preview not supported for this file type.']];
			}
		} catch (e) {
			previewRows = [[`Failed to generate preview: ${e}`]];
		}
		previewLoading = false;
	}

	const submitHandler = async () => {
		loading = true;

		if (
			name.trim() === '' ||
			question_field_name.trim() === '' || answer_field_name.trim() === '' ||
			file == null
		) {
			toast.error($i18n.t('Please complete all mandatory fields.'));
			name = '';
			description = description;
			loading = false;
			return;
		}

		const res = await createNewKnowledge(
			localStorage.token,
			name,
			description,
			question_field_name,
			answer_field_name,
			file,
			accessControl
		).catch((e) => {
			toast.error(`${e}`);
		});

		if (res) {
			toast.success($i18n.t('Knowledge created successfully.'));
			knowledge.set(await getKnowledgeBases(localStorage.token));
			goto(`/workspace/knowledge`);
		}

		loading = false;
	};

	function validateFile(file: File) {
		if (!acceptedTypes.includes(file.type)) {
			toast.error(`The file type is not supported: ${file.name}!`);
			return false;
		}
		if (file.size > MAX_FILE_SIZE) {
			toast.error(`The file size should not exceed 200MB: ${file.name}!`);
			return false;
		}
		return true;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (file) return;
		const droppedFile = event.dataTransfer?.files[0];
		if (droppedFile && validateFile(droppedFile)) {
			file = droppedFile;
			generatePreview(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleFileSelect(event: Event) {
		if (file) return;
		const input = event.target as HTMLInputElement;
		const selectedFile = input.files?.[0];
		if (selectedFile && validateFile(selectedFile)) {
			file = selectedFile;
			generatePreview(file);
		}
	}

	function removeFile() {
		file = null;
		previewRows = null;
		columns = [];
	}

	// Add reactive statement after variables
	$: if (question_field_name && question_field_name === answer_field_name) {
		// reset the duplicate selection
		answer_field_name = '';
	}
</script>

<style>
    .dropzone {
        width: 100%;
        height: 440px;
        border: 2px dashed #ccc;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #aaa;
        cursor: pointer;
        opacity: 1;
        transition: opacity 0.3s ease;
    }
    .dropzone:hover {
        border-color: #888;
    }
    .dropzone.disabled {
        opacity: 0.5;
        pointer-events: none;
    }
</style>

<div class="w-full max-h-full">
	<button
		class="flex space-x-1"
		on:click={() => {
			goto('/workspace/knowledge');
		}}
	>
		<div class=" self-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="w-4 h-4"
			>
				<path
					fill-rule="evenodd"
					d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
					clip-rule="evenodd"
				/>
			</svg>
		</div>
		<div class=" self-center font-medium text-sm">{$i18n.t('Back')}</div>
	</button>

	<form
		class="flex flex-col gap-5 max-w-3xl mx-auto mt-5"
		on:submit|preventDefault={() => {
			submitHandler();
		}}
	>
		<div class="w-full">
			<div class=" text-2xl font-medium font-primary mb-3">
				{$i18n.t('Create a knowledge-base')}
			</div>

			<div class="text-xs text-gray-600 dark:text-gray-400 space-y-2 mb-5">
				<div>{$i18n.t('Please ensure the dataset meets the following requirements before uploading:')}</div>
				<ul class="list-disc list-inside space-y-1">
					<li>{$i18n.t('The dataset must contain exactly 2 columns representing the question and the answer.')}</li>
					<li>{$i18n.t('The dataset size should not exceed')} {MAX_FILE_SIZE / (1024 * 1024)}MB.</li>
					<li>{$i18n.t('The dataset must be in one of the following formats: .xlsx, .csv, .json, .jsonl.')}</li>
				</ul>
			</div>

			<div class="flex flex-col md:flex-row gap-7">
				<!-- Left column -->
				<div class="w-full md:w-1/2 flex flex-col gap-2.5">
					<div class="w-full">
						<div class=" text-sm mb-2">{$i18n.t('What are you working on? ')}<span class="text-red-600">*</span></div>

						<div class="w-full relative">
							<input
								class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
								type="text"
								bind:value={name}
								placeholder={$i18n.t('Name your knowledge base')}
								maxlength={NAME_CHAR_LIMIT}
								required
							/>
							<div class="absolute right-2 bottom-2 text-xs text-gray-500">
								{nameCharCount}/{NAME_CHAR_LIMIT} {$i18n.t('characters')}
							</div>
						</div>
					</div>

					<div class="w-full mt-2">
						<div class="text-sm mb-2">{$i18n.t('What are you trying to achieve? (optional)')}</div>

						<div class="w-full relative">
							<textarea
								class="w-full resize-none rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
								rows="4"
								bind:value={description}
								placeholder={$i18n.t('Describe your knowledge base and objectives')}
								maxlength={DESCRIPTION_CHAR_LIMIT}
							/>
							<div class="absolute right-2 bottom-2 text-xs text-gray-500">
								{descriptionCharCount}/{DESCRIPTION_CHAR_LIMIT} {$i18n.t('characters')}
							</div>
						</div>
					</div>

					<div class="w-full flex flex-row gap-3">
						<div class="w-full">
							<div class="text-sm mb-2">{$i18n.t('Enter question column name ')}<span class="text-red-600">*</span></div>

							<div class=" w-full">
								<Tooltip content={$i18n.t('Please upload a file first')} show={columns.length === 0}>
								<select
									class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
									bind:value={question_field_name}
									disabled={columns.length === 0}
								>
									<option value="" disabled selected>{$i18n.t('Select column')}</option>
									{#each columns as col}
										{#if col !== answer_field_name}
											<option value={col}>{col}</option>
										{/if}
									{/each}
								</select>
								</Tooltip>
							</div>
						</div>

						<div class="w-full">
							<div class="text-sm mb-2">{$i18n.t('Enter answer column name ')}<span class="text-red-600">*</span></div>

							<div class=" w-full">
								<Tooltip content={$i18n.t('Please upload a file first')} show={columns.length === 0}>
								<select
									class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
									bind:value={answer_field_name}
									disabled={columns.length === 0}
								>
									<option value="" disabled selected>{$i18n.t('Select column')}</option>
									{#each columns as col}
										{#if col !== question_field_name}
											<option value={col}>{col}</option>
										{/if}
									{/each}
								</select>
								</Tooltip>
							</div>
						</div>
					</div>

					<!-- disclaimer -->
					<div class="text-xs text-gray-600 dark:text-gray-400 space-y-2 mt-7">
						<div class="italic font-bold">{$i18n.t('Disclaimer')}: {$i18n.t('You shall take full responsibility for the data used to train the model. We do not take respondibility for any misleading information, bias, or illegal activities.')}</div>
						<div class="flex items-center gap-2 pt-2">
							<input id="ackCheckbox" type="checkbox" bind:checked={acknowledged} class="accent-blue-600" />
							<label for="ackCheckbox" class="select-none">{$i18n.t('I acknowledge and agree to the above disclaimer.')}</label>
						</div>
						
						<div class="flex justify-start mt-3">
							<div>
								<button
									class=" text-sm px-4 py-2 transition rounded-lg {loading || !acknowledged || !file || name.trim().length == 0 || question_field_name.trim().length == 0 || answer_field_name.trim().length == 0
										? ' cursor-not-allowed bg-gray-100 dark:bg-gray-800'
										: ' bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800'} flex"
									type="submit"
									disabled={loading || !acknowledged || !file || name.trim().length == 0 || question_field_name.trim().length == 0 || answer_field_name.trim().length == 0}
								>
									<div class=" self-center font-medium">{$i18n.t('Create Knowledge')}</div>

									{#if loading}
										<div class="ml-1.5 self-center">
											<svg
												class=" w-4 h-4"
												viewBox="0 0 24 24"
												fill="currentColor"
												xmlns="http://www.w3.org/2000/svg"
												><style>
													.spinner_ajPY {
														transform-origin: center;
														animation: spinner_AtaB 0.75s infinite linear;
													}
													@keyframes spinner_AtaB {
														100% {
															transform: rotate(360deg);
														}
													}
												</style><path
													d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
													opacity=".25"
												/><path
													d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
													class="spinner_ajPY"
												/></svg
											>
										</div>
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Right column -->
				<div class="w-full md:w-1/2 flex flex-col gap-2.5">
					<div>
						{#if !file}
							<div class="text-sm mb-2">{$i18n.t('Upload File ')}<span class="text-red-600">*</span></div>
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<div
								role="button"
								aria-label="File upload drop-zone"
								tabindex="0"
								class="dropzone {file ? 'disabled cursor-not-allowed' : 'cursor-pointer'} rounded-lg"
								bind:this={dropzone}
								on:dragover={handleDragOver}
								on:drop={handleDrop}
								on:click={() => !file && document.getElementById('fileInput')?.click()}
							>
								<div class=" self-center font-medium text-sm">
									<div class="text-center text-6xl mb-3">📄</div>
									<span>Drag and drop a file or click to select a file.</span>
								</div>
								<input
									id="fileInput"
									type="file"
									hidden
									accept=".xlsx,.csv,.json,.jsonl"
									on:change={handleFileSelect}
									required
								/>
							</div>
						{/if}

						{#if file}
							<div class="text-sm mb-2">{$i18n.t('File Preview')}</div>
							<div class="mt-2">
								<!-- svelte-ignore a11y -->
								<!-- @ts-ignore -->
								<FileItem
									className="w-full"
									item={file}
									edit={true}
									url={file?.url ?? null}
									name={file.name}
									type={file.type}
									size={file?.size ?? 0}
									dismissible={true}
									on:dismiss={() => {
										file = null;
										removeFile();
									}}
								/>
							</div>

							<!-- Dataset preview -->
							<div class="mt-3">
								{#if previewLoading}
									<div class="flex justify-center items-center py-4">
										<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
											<path d="M22 12a10 10 0 0 1-10 10" ></path>
										</svg>
									</div>
								{:else if previewRows}
									<div class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-auto max-h-90">
										<table class="min-w-full text-xs">
											{#each previewRows as row, rIdx}
												<tr class="{rIdx === 0 ? 'sticky top-0 z-10 bg-gray-50 dark:bg-gray-850 font-medium' : ''}">
													{#each row as cell}
														<td class="px-2 py-1 whitespace-pre-wrap border-b border-gray-50 dark:border-gray-850">
															{cell}
														</td>
													{/each}
												</tr>
											{/each}
										</table>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</form>
</div>
