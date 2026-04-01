<script lang="ts">
	import ServerStatus from '$lib/components/ServerStatus.svelte';
	import JamControls from '$lib/components/JamControls.svelte';
	import ScheduleControl from '$lib/components/ScheduleControl.svelte';
	import BroadcastPreview from '$lib/components/BroadcastPreview.svelte';
	import PoolView from '$lib/components/PoolView.svelte';
	import SceneQueues from '$lib/components/SceneQueues.svelte';
	import SlotTimers from '$lib/components/SlotTimers.svelte';
</script>

<main class="c-admin">
	<h1>Admin</h1>
	<ServerStatus />
	<JamControls />
	<ScheduleControl />
	<BroadcastPreview />
	<SlotTimers />
	<SceneQueues />
	<PoolView />
</main>