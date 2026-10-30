<script lang="ts">
  import PageControls from './PageControls.svelte';

  let { onBack, onHome, homeLabel = 'All characters', embedded = false }: {
    onBack: () => void;
    onHome: () => void;
    homeLabel?: string;
    embedded?: boolean;
  } = $props();
</script>

{#if !embedded}
  <PageControls controls={[
    { label: 'Back', onClick: onBack },
    { label: homeLabel, onClick: onHome, primary: true },
  ]} />
{/if}
