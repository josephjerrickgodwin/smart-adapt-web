<script>
	import { onMount } from 'svelte';
	import { functions } from '$lib/stores';

	import { getFunctions } from '$lib/apis/functions';

	onMount(async () => {
		await Promise.all([
			(async () => {
				functions.set(await getFunctions(localStorage.token));
			})()
		]);
	});
</script>
