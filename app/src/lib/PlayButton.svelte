<script lang="ts">
    import * as AudioFiles from "./audio";

    let { text, fallbackText }: { text: string; fallbackText?: string } = $props();
    let source = $state<string>();

    $effect(() => {
        source = undefined;
        void AudioFiles.getPronunciationAudio(text, fallbackText).then((next) => source = next);
    });

    function play() {
        if (source) void new Audio(source).play().catch(() => {});
    }
</script>

{#if source}
    <button
        class="play-button"
        type="button"
        onclick={play}
        aria-label={`Play Mandarin pronunciation of ${text}`}
        title="Play Mandarin pronunciation"
    >
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z" /></svg>
    </button>
{/if}

<style>
    .play-button {
        display: inline-grid;
        width: 1rem;
        height: 1rem;
        place-items: center;
        flex: none;
        padding: 0;
        border: 0;
        border-radius: var(--radius-sm);
        background: var(--color-accent);
        color: var(--color-on-accent);
    }
    .play-button:hover {
        background: var(--color-link);
    }
    .play-button svg {
        width: 0.75rem;
        height: 0.75rem;
        opacity: 0.76;
        fill: currentColor;
    }
</style>
