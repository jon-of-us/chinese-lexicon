<script lang="ts">
    import PlayButton from "./PlayButton.svelte";

    type TopWord = { word: string; gloss: string; share: number };
    let {
        words,
        colorFor,
        pinyinFor,
        onOpen,
    }: {
        words: TopWord[];
        colorFor: (text: string) => string;
        pinyinFor: (word: string) => string;
        onOpen: (event: MouseEvent, word: string) => void;
    } = $props();
</script>

<ol class="words">
    {#each words as word}
        <li>
            <span class="word-pronunciation"
                ><a
                    class="word-link"
                    style={`color: ${colorFor(word.word)}`}
                    href={`/word/${encodeURIComponent(word.word)}`}
                    onclick={(event) => onOpen(event, word.word)}>{word.word}</a
                ><span class="word-details"
                    ><PlayButton text={word.word} />
                    <small class="component-pinyin"
                        >{pinyinFor(word.word)}</small
                    ></span
                ></span
            ><span class="usage"
                ><i style={`width: ${Math.max(word.share * 100, 2)}%`}
                ></i></span
            ><span class="word-translation">{word.gloss}</span>
        </li>
    {/each}
</ol>

<style>
    .words {
        display: grid;
        grid-template-columns: max-content minmax(120px, 240px) minmax(
                150px,
                1fr
            );
        gap: var(--space-sm);
        margin: 0;
        padding: 0;
        list-style: none;
    }
    .words li {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) 0;
        border-bottom: var(--border-width) solid var(--color-border-subtle);
    }
    .words li:last-child {
        border-bottom: 0;
    }
    .word-pronunciation {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-xs);
    }
    .word-link {
        color: var(--color-link);
        font-size: var(--font-size-word);
        text-decoration: none;
    }
    .word-details {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        flex-basis: 100%;
    }
    .word-pronunciation small {
        color: var(--color-muted);
        font-size: var(--font-size-small);
    }
    .usage {
        height: var(--space-sm);
        overflow: hidden;
        border-radius: var(--radius-sm);
        background: var(--color-border-subtle);
    }
    .usage i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--color-accent);
    }
    .word-translation {
        color: var(--color-muted);
    }

    .word-pronunciation .component-pinyin {
        color: var(--color-accent);
        font-weight: var(--font-weight-bold);
    }
</style>
