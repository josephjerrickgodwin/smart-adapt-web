<script lang="ts">
	import Fuse from 'fuse.js';

	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy, getContext } from 'svelte';
	const i18n: any = getContext('i18n');

	import { WEBUI_NAME, knowledge, user } from '$lib/stores';
	import {
		getKnowledgeBases,
		deleteKnowledgeById,
		getKnowledgeBaseList,
		downloadAdapter,
		stopKnowledgeTraining
	} from '$lib/apis/knowledge';

	import { goto } from '$app/navigation';

	import DeleteConfirmDialog from '../common/ConfirmDialog.svelte';
	import ItemMenu from './Knowledge/ItemMenu.svelte';
	import Badge from '../common/Badge.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import Spinner from '../common/Spinner.svelte';
	import { capitalizeFirstLetter } from '$lib/utils';
	import Tooltip from '../common/Tooltip.svelte';
	import WandbGraphsModal from './Knowledge/WandbGraphsModal.svelte';
	import ArrowDownTray from '../icons/ArrowDownTray.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import { flyAndScale } from '$lib/utils/transitions';
	import { DropdownMenu } from 'bits-ui';
	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import GarbageBin from '../icons/GarbageBin.svelte';
	import Stop from '../icons/Stop.svelte';
	import type { KnowledgeBase } from '$lib/types';

	let loaded = false;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	const POLLING_INTERVAL = 5000; // 5 seconds

	// Track knowledge bases that are in progress
	let inProgressKnowledgeIds = new Set<string>();

	// Function to check if any knowledge base is in progress
	function hasInProgressKnowledge(bases: KnowledgeBase[]): boolean {
		return bases.some(kb => kb.data?.status === 'In Progress');
	}

	// Function to update inProgressKnowledgeIds
	function updateInProgressIds(bases: KnowledgeBase[]) {
		inProgressKnowledgeIds = new Set(
			bases
				.filter(kb => kb.data?.status === 'In Progress')
				.map(kb => kb.id)
		);
	}

	// Function to start polling if needed
	function startPollingIfNeeded() {
		if (!pollingInterval && inProgressKnowledgeIds.size > 0) {
			pollingInterval = setInterval(async () => {
				try {
					const updatedBases = await getKnowledgeBaseList(localStorage.token);
					
					// Update only the knowledge bases that were in progress
					knowledgeBases = knowledgeBases.map(kb => {
						if (inProgressKnowledgeIds.has(kb.id)) {
							const updatedKb = updatedBases.find((updated: KnowledgeBase) => updated.id === kb.id);
							if (updatedKb) {
								// If status changed from In Progress, remove from tracking
								if (updatedKb.data?.status !== 'In Progress') {
									inProgressKnowledgeIds.delete(kb.id);
								}
								return updatedKb;
							}
						}
						return kb;
					});

					// Stop polling if no more in-progress items
					if (inProgressKnowledgeIds.size === 0) {
						stopPolling();
					}

					// Update the knowledge store
					knowledge.set(await getKnowledgeBases(localStorage.token));
				} catch (error) {
					console.error('Error polling knowledge bases:', error);
				}
			}, POLLING_INTERVAL);
		}
	}

	// Function to stop polling
	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	// Update polling when knowledgeBases changes
	$: if (knowledgeBases) {
		updateInProgressIds(knowledgeBases);
		startPollingIfNeeded();
	}

	let query = '';
	let selectedItem: KnowledgeBase | null = null;
	let showDeleteConfirm = false;

	let fuse: Fuse<KnowledgeBase> | null = null;
	let activeDropdownId: string | null = null;

	let knowledgeBases: KnowledgeBase[] = [];
	let filteredItems: KnowledgeBase[] = [];

	let show = false;

	let showWandbGraphs = false;
	let selectedKnowledgeId: string | undefined = undefined;
	let selectedUserId: string | undefined = undefined;
	let selectedStatus: string | undefined = undefined;

	let downloadingIds: Set<string> = new Set();
	let stoppingIds = new Set<string>();

	$: if (knowledgeBases) {
		fuse = new Fuse(knowledgeBases, {
			keys: ['name', 'description']
		});
	}

	$: if (fuse) {
		filteredItems = query
			? fuse.search(query).map((e) => e.item)
			: knowledgeBases;
	}

	const deleteHandler = async (item: KnowledgeBase) => {
		if (!item) return;
		
		// Prevent deletion if the knowledge base is being downloaded
		if (downloadingIds.has(item.id)) {
			toast.error($i18n.t('Cannot delete knowledge base while it is being downloaded'));
			return;
		}

		const res = await deleteKnowledgeById(localStorage.token, item.id).catch((e) => {
			toast.error(`${e}`);
		});

		if (res) {
			knowledgeBases = await getKnowledgeBaseList(localStorage.token);
			knowledge.set(await getKnowledgeBases(localStorage.token));
			toast.success($i18n.t('Knowledge deleted successfully.'));
		}
	};

	const openWandbGraphs = (item: KnowledgeBase) => {
		selectedKnowledgeId = item?.id;
		selectedUserId = item?.user?.id;
		selectedStatus = item?.data?.status;
		showWandbGraphs = true;
	};

	const downloadAdapterHandler = async (item: any) => {
		if (!item?.id) return;
		if (downloadingIds.has(item.id)) return; // guard against duplicate clicks

		// Mark as downloading
		downloadingIds.add(item.id);

		// Show loading toast
		const loadingToastId = toast.info(
			$i18n.t('Preparing to download {{name}}...', {
				name: item.name
			}),
			{
				duration: Infinity
			}
		);

		try {
			await downloadAdapter(localStorage.token, $user!.id as string, item.id);
			toast.success($i18n.t('Started downloading {{name}}...', {
				name: item.name
			}));
		} catch (err) {
			toast.error(`${err}`);
		} finally {
			// Dismiss loading toast if API exists
			if (typeof toast.dismiss === 'function') {
				// @ts-ignore
				toast.dismiss(loadingToastId);
			}
			downloadingIds.delete(item.id);
		}
	};

	const stopTraining = async (item: KnowledgeBase) => {
		if (!item?.id || !$user?.id || stoppingIds.has(item.id)) return;

		try {
			stoppingIds.add(item.id);
			await stopKnowledgeTraining(localStorage.token, $user.id, item.id);
			toast.success($i18n.t('Training stopped successfully'));
			
			// Refresh knowledge bases to get updated status
			knowledgeBases = await getKnowledgeBaseList(localStorage.token);
			knowledge.set(await getKnowledgeBases(localStorage.token));
		} catch (err) {
			toast.error(`${err}`);
		} finally {
			stoppingIds.delete(item.id);
		}
	};

	onMount(async () => {
		knowledgeBases = await getKnowledgeBaseList(localStorage.token);
		loaded = true;
		
		// Start polling if there are any in-progress knowledge bases
		if (hasInProgressKnowledge(knowledgeBases)) {
			updateInProgressIds(knowledgeBases);
			startPollingIfNeeded();
		}
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Knowledge')} | {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<DeleteConfirmDialog
		bind:show={showDeleteConfirm}
		on:confirm={() => {
			if (selectedItem) {
				deleteHandler(selectedItem);
			}
		}}
	/>

	<WandbGraphsModal
		bind:show={showWandbGraphs}
		knowledgeId={selectedKnowledgeId}
		userId={selectedUserId}
		status={selectedStatus}
	/>

	<div class="flex flex-col gap-1 my-1.5">
		<div class="flex justify-between items-center">
			<div class="flex md:self-center text-xl font-medium px-0.5 items-center">
				{$i18n.t('Knowledge')}
				<div class="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
				<span class="text-lg font-medium text-gray-500 dark:text-gray-300"
					>{filteredItems.length}</span
				>
			</div>
		</div>

		<div class=" flex w-full space-x-2">
			<div class="flex flex-1">
				<div class=" self-center ml-1 mr-3">
					<Search className="size-3.5" />
				</div>
				<input
					class=" w-full text-sm py-1 rounded-r-xl outline-hidden bg-transparent"
					bind:value={query}
					placeholder={$i18n.t('Search Knowledge')}
				/>
			</div>

			<div>
				<button
					class=" px-2 py-2 rounded-xl hover:bg-gray-700/10 dark:hover:bg-gray-100/10 dark:text-gray-300 dark:hover:text-white transition font-medium text-sm flex items-center space-x-1"
					aria-label={$i18n.t('Create Knowledge')}
					on:click={() => {
						goto('/workspace/knowledge/create');
					}}
				>
					<Plus className="size-3.5" />
				</button>
			</div>
		</div>
	</div>

	<div class="mb-5 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
		{#each filteredItems as item}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class=" flex space-x-4 text-left w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-850 transition rounded-xl cursor-pointer border-1"
				on:click={() => openWandbGraphs(item)}
			>
				<div class="w-full">
					<div class="flex items-center justify-between mt-1">
						{#if item?.data?.status === 'In Progress'}
							<div class="flex gap-2 w-full items-center justify-between">
								<Badge type="warning" content={$i18n.t('IN PROGRESS')} />
								<Tooltip content={$i18n.t('Stop Training')}>
									<button
										class="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
										on:click|stopPropagation={() => stopTraining(item)}
										disabled={stoppingIds.has(item.id)}
									>
										{#if stoppingIds.has(item.id)}
											<Spinner className="size-4" />
										{:else}
											<Stop className="size-4" />
										{/if}
									</button>
								</Tooltip>
							</div>
						{:else if item?.data?.status === 'Completed'}
							<Badge type="success" content={$i18n.t('SUCCESSFUL')} />
						{:else if item?.data?.status === 'Failed'}
							<Badge type="error" content={$i18n.t('ERROR')} />
						{:else if item?.data?.status === 'Stopped'}
							<Badge type="warning" content={$i18n.t('STOPPED')} />
						{:else}
							<Badge type="warning" content={item?.data?.status ? item.data.status : $i18n.t('UNKNOWN')} />
						{/if}

						{#if item?.data?.status !== 'In Progress'}
							<div class=" flex self-center -mr-1 translate-y-1">
								<Dropdown
									show={activeDropdownId === item.id}
									on:change={(e) => {
										if (e.detail === false) {
											activeDropdownId = null;
										}
									}}
									align="end"
								>
									<Tooltip content={$i18n.t('More')}>
										<slot
											><button
												class="self-center w-fit text-sm p-1.5 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
												type="button"
												on:click={(e) => {
													e.stopPropagation();
													activeDropdownId = activeDropdownId === item.id ? null : item.id;
												}}
											>
												<EllipsisHorizontal className="size-5" />
											</button>
										</slot>
									</Tooltip>

									<div slot="content">
										<DropdownMenu.Content
											class="w-full max-w-[160px] rounded-xl px-1 py-1.5 border border-gray-300/30 dark:border-gray-700/50 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-sm"
											sideOffset={-2}
											side="bottom"
											align="end"
											transition={flyAndScale}
										>
											{#if $user?.role === 'admin' || item?.user?.id === $user?.id || (item?.access_control?.write?.group_ids && item?.access_control?.write?.group_ids.length > 0 && $user?.group_ids && item.access_control.write.group_ids.some(gid => $user.group_ids.includes(gid)))}
												<DropdownMenu.Item
													class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
													on:click={() => {
														selectedItem = item;
														showDeleteConfirm = true;
													}}
													disabled={downloadingIds.has(item.id)}
													style="opacity: {downloadingIds.has(item.id) ? 0.5 : 1}; cursor: {downloadingIds.has(item.id) ? 'not-allowed' : 'pointer'};"
												>
													<GarbageBin strokeWidth="2" />
													<div class="flex items-center">{$i18n.t('Delete')}</div>
												</DropdownMenu.Item>
											{/if}

											{#if item?.data?.status === 'Completed'}
												<DropdownMenu.Item
													class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
													disabled={downloadingIds.has(item.id)}
													on:click={() => {
														if (downloadingIds.has(item.id)) return; // disabled
														selectedItem = item;
														downloadAdapterHandler(item);
													}}
													style="opacity: {downloadingIds.has(item.id) ? 0.5 : 1};"
												>
													<ArrowDownTray className="w-4 h-4" />
													<div class="flex items-center">{$i18n.t('Download')}</div>
												</DropdownMenu.Item>
											{/if}
										</DropdownMenu.Content>
									</div>
								</Dropdown>
							</div>
						{/if}
					</div>

					<div class=" self-center flex-1 px-1 mb-1 mt-2">
						<div class=" font-semibold line-clamp-1 h-fit">{item.name}</div>

						<div class=" text-xs overflow-hidden text-ellipsis line-clamp-1">
							{item.description}
						</div>

						<div class="mt-3 flex justify-between">
							<div class="text-xs text-gray-500">
								<Tooltip
									content={item?.user?.email ?? $i18n.t('Deleted User')}
									className="flex shrink-0"
									placement="top-start"
								>
									{$i18n.t('By {{name}}', {
										name: capitalizeFirstLetter(
											item?.user?.name ?? item?.user?.email ?? $i18n.t('Deleted User')
										)
									})}
								</Tooltip>
							</div>
							<div class=" text-xs text-gray-500 line-clamp-1">
								{$i18n.t('Updated')}
								{dayjs(item.updated_at * 1000).fromNow()}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class=" text-gray-500 text-xs mt-1 mb-2">
		ⓘ {$i18n.t("Use '#' in the prompt input to load and include your knowledge.")}
	</div>
{:else}
	<div class="w-full h-full flex justify-center items-center">
		<Spinner />
	</div>
{/if}
