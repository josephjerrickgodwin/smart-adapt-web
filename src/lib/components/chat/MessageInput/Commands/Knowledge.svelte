<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Fuse from 'fuse.js';

	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { createEventDispatcher, tick, getContext, onMount } from 'svelte';
	import { removeLastWordFromString, isValidHttpUrl } from '$lib/utils';
	import { knowledge } from '$lib/stores';

	const i18n = getContext('i18n');

	export let prompt = '';
	export let command = '';

	const dispatch = createEventDispatcher();
	let selectedIdx = 0;

	let items = [];
	let fuse = null;

	let filteredItems = [];
	$: if (fuse) {
		filteredItems = command.slice(1)
			? fuse.search(command).map((e) => {
					return e.item;
				})
			: items;
	}

	$: if (command) {
		selectedIdx = 0;
	}

	const confirmSelect = async (item) => {
		dispatch('select', item);

		prompt = removeLastWordFromString(prompt, command);
		const chatInputElement = document.getElementById('chat-input');

		await tick();
		chatInputElement?.focus();
		await tick();
	};

	onMount(() => {
		let collections = $knowledge
			.filter((item) => item.data?.status === "Completed")
			.map((item) => ({
				...item,
				type: 'collection'
			}));

		items = [...collections].map(
			(item) => {
				return {
					...item,
					...(item?.legacy || item?.meta?.legacy || item?.meta?.document ? { legacy: true } : {})
				};
			}
		);

		fuse = new Fuse(items, {
			keys: ['name', 'description']
		});
	});
</script>

{#if filteredItems.length > 0}
	<div
		id="commands-container"
		class="px-2 mb-2 text-left w-full absolute bottom-0 left-0 right-0 z-10"
	>
		<div class="flex w-full rounded-xl border border-gray-100 dark:border-gray-850">
			<div
				class="max-h-60 flex flex-col w-full rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100"
			>
				<div class="m-1 overflow-y-auto p-1 rounded-r-xl space-y-0.5 scrollbar-hidden">
					{#each filteredItems as item, idx}
						<button
							class=" px-3 py-1.5 rounded-xl w-full text-left flex justify-between items-center {idx ===
							selectedIdx
								? ' bg-gray-50 dark:bg-gray-850 dark:text-gray-100 selected-command-option-button'
								: ''}"
							type="button"
							on:click={() => {
								confirmSelect(item);
							}}
							on:mousemove={() => {
								selectedIdx = idx;
							}}
						>
							<div>
								<div class=" font-medium text-black dark:text-gray-100 flex items-center gap-1">
									{#if item.legacy}
										<div
											class="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0"
										>
											Legacy
										</div>
									{:else if item?.meta?.document}
										<div
											class="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0"
										>
											Document
										</div>
									{:else if item?.type === 'file'}
										<div
											class="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0"
										>
											File
										</div>
									{:else}
										<div
											class="bg-green-500/20 text-green-700 dark:text-green-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0"
										>
											Knowledge
										</div>
									{/if}

									<div class="line-clamp-1">
										{item?.name}
									</div>
								</div>

								<div class=" text-xs text-gray-600 dark:text-gray-100 line-clamp-1">
									{item?.description}
								</div>
							</div>
						</button>

					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
