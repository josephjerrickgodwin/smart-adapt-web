<script>
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import { createNewKnowledge, getKnowledgeBases } from '$lib/apis/knowledge';
	import { toast } from 'svelte-sonner';
	import { knowledge } from '$lib/stores';
	import AccessControl from '../common/AccessControl.svelte';
	import FilesOverlay from '$lib/components/chat/MessageInput/FilesOverlay.svelte';
	import AddFilesPlaceholder from '$lib/components/AddFilesPlaceholder.svelte';
	import FileItem from '$lib/components/common/FileItem.svelte';

	let loading = false;

	let name = '';
	let description = '';
	let question_field_name = '';
	let answer_field_name = '';
	let accessControl = null;
	let dropzone;
	let file = null;
	const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
	const acceptedTypes = [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"text/csv",
		"application/json",
	];

	const submitHandler = async () => {
		loading = true;

		if (
					name.trim() === '' || description.trim() === '' ||
					question_field_name.trim() === '' || answer_field_name.trim() === '' ||
			    file == null
		) {
			toast.error($i18n.t('Please fill in all fields.'));
			name = '';
			description = '';
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

	function validateFile(file) {
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

	function handleDrop(event) {
		event.preventDefault();
		if (file) return;
		const droppedFile = event.dataTransfer.files[0];
		if (validateFile(droppedFile)) {
			file = droppedFile;
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
	}

	function handleFileSelect(event) {
		if (file) return;
		const selectedFile = event.target.files[0];
		if (validateFile(selectedFile)) {
			file = selectedFile;
		}
	}

	function removeFile() {
		file = null;
	}
</script>

<style>
    .dropzone {
        width: 100%;
        height: 200px;
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
		class="flex flex-col max-w-lg mx-auto mt-10 mb-10"
		on:submit|preventDefault={() => {
			submitHandler();
		}}
	>
		<div class=" w-full flex flex-col justify-center">
			<div class=" text-2xl font-medium font-primary mb-2.5">
				{$i18n.t('Create a knowledge base')}
			</div>

			<div class="w-full flex flex-col gap-2.5">
				<div class="w-full">
					<div class=" text-sm mb-2">{$i18n.t('What are you working on?')}</div>

					<div class="w-full mt-1">
						<input
							class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							type="text"
							bind:value={name}
							placeholder={$i18n.t('Name your knowledge base')}
							required
						/>
					</div>
				</div>

				<div>
					<div class="text-sm mb-2">{$i18n.t('What are you trying to achieve?')}</div>

					<div class=" w-full mt-1">
						<textarea
							class="w-full resize-none rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							rows="4"
							bind:value={description}
							placeholder={$i18n.t('Describe your knowledge base and objectives')}
							required
						/>
					</div>
				</div>

				<div class="w-full flex flex-row gap-2.5">
					<div class="w-full">
						<div class="text-sm mb-2">{$i18n.t('Enter question column name')}</div>

						<div class=" w-full mt-1">
						<textarea
							class="w-full resize-none rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							rows="2"
							bind:value={question_field_name}
							placeholder={$i18n.t('Column name corresponding to questions')}
							required
						/>
						</div>
					</div>

					<div class="w-full">
						<div class="text-sm mb-2">{$i18n.t('Enter answer column name')}</div>

						<div class=" w-full mt-1">
						<textarea
							class="w-full resize-none rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							rows="2"
							bind:value={answer_field_name}
							placeholder={$i18n.t('Column name corresponding to questions')}
							required
						/>
						</div>
					</div>
				</div>

				<div>
					<div class="text-sm mb-2">{$i18n.t('Upload File')}</div>
					<div
						class="dropzone {file ? 'disabled cursor-not-allowed' : 'cursor-pointer'} rounded-lg"
						bind:this={dropzone}
						on:dragover={handleDragOver}
						on:drop={handleDrop}
						on:click={() => !file && document.getElementById('fileInput').click()}
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

					{#if file}
						<div class="mt-2">
							<FileItem
								className="w-full"
								item={file}
								edit={true}
								url={file?.url ? file.url : null}
								name={file.name}
								type={file.type}
								size={file?.size}
								dismissible={true}
								on:dismiss={removeFile}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="mt-3">
			<div class="px-3 py-2 bg-gray-50 dark:bg-gray-950 rounded-lg">
				<AccessControl bind:accessControl accessRoles={['read', 'write']} />
			</div>
		</div>

		<div class="flex justify-end mt-2 mb-5">
			<div>
				<button
					class=" text-sm px-4 py-2 transition rounded-lg {loading
						? ' cursor-not-allowed bg-gray-100 dark:bg-gray-800'
						: ' bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800'} flex"
					type="submit"
					disabled={loading}
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
	</form>
</div>
