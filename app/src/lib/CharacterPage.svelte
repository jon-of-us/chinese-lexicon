<script lang="ts">
    import {
        getComponentForms,
        getEntries,
        getEtymology,
        getFrequencyScores,
    } from "./dictionary";
    import { componentTypeNames, config } from "./config";
    import * as Dictionary from "./dictionary";
    import * as FitHeadline from "./fit-headline";
    import * as Settings from "./settings";
    import FrequentWords from "./FrequentWords.svelte";
    import DictionaryPageControls from "./DictionaryPageControls.svelte";
    import PlayButton from "./PlayButton.svelte";
    import type { Entry, Etymology } from "./types";

    let {
        character,
        word,
        colorFor,
        onBack,
        onHome,
        homeLabel = "All characters",
        onOpen,
        onOpenComponent,
        componentColorFor,
        embedded = false,
        headlineSize = Settings.defaultDetailHeadlineSize,
    }: {
        character: string;
        word: string;
        colorFor: (text: string) => string;
        onBack: () => void;
        onHome: () => void;
        homeLabel?: string;
        onOpen: (entry: string) => void;
        onOpenComponent?: (event: MouseEvent, component: string) => void;
        componentColorFor?: (component: string) => string;
        embedded?: boolean;
        headlineSize?: number;
    } = $props();
    const entry = $derived(character || word);
    const entries = $derived(entry ? (getEntries(entry) as Entry[]) : []);
    const primary = $derived(entries[0]);
    const simplified = $derived(
        character && primary?.simp !== character ? primary?.simp : "",
    );
    const scores = $derived(getFrequencyScores(entry));
    const etymology = $derived(
        character
            ? (getEtymology(character) as Etymology | undefined)
            : undefined,
    );
    const topWords = $derived(
        primary?.statistics?.topWords?.slice(0, config.data.topWordsLimit) ??
            [],
    );
    const componentForms = $derived(
        character ? getComponentForms(character) : [],
    );
    const dictionaryMeanings = $derived(
        entries.flatMap((entry) =>
            entry.definitions
                .filter((definition) => !definition.startsWith("CL:"))
                .map((definition) => definition),
        ),
    );
    let showAllMeanings = $state(false);
    let meaningsEntry = $state("");
    const visibleMeanings = $derived(
        showAllMeanings ? dictionaryMeanings : dictionaryMeanings.slice(0, 4),
    );
    const displayComponents = $derived(
        character ? Dictionary.getStructureParts(character) : [],
    );

    function pinyinFor(text: string) {
        return (getEntries(text) as Entry[])[0]?.pinyin ?? "";
    }
    function meaningFor(text: string) {
        return (
            (getEntries(text) as Entry[])[0]?.definitions.find(
                (definition) => !definition.startsWith("CL:"),
            ) ?? "Character"
        );
    }
    function open(event: MouseEvent, text: string) {
        event.preventDefault();
        onOpen(text);
    }
    function openComponent(event: MouseEvent, text: string) {
        if (onOpenComponent) onOpenComponent(event, text);
        else open(event, text);
    }
    function colorComponent(text: string) {
        return componentColorFor?.(text) ?? colorFor(text);
    }
    function known(text: string) {
        return /^\p{Script=Han}$/u.test(text) && getEntries(text).length > 0;
    }
    $effect(() => {
        if (entry !== meaningsEntry) {
            meaningsEntry = entry;
            showAllMeanings = false;
        }
    });
</script>

<section class="page">
    {#if primary}<div class="hero">
            <div class="hero-text">
                <p class="eyebrow">{character ? "Character" : "Word"}</p>
                <h1 use:FitHeadline.fitHeadline={headlineSize}>
                    {#if word}{#each Array.from(word) as glyph}<a
                                href={`/character/${encodeURIComponent(glyph)}`}
                                onclick={(event) => open(event, glyph)}
                                style={`color: ${colorFor(word)}`}>{glyph}</a
                            >{/each}{:else}<span
                            style={`color: ${colorFor(character)}`}
                            >{character}</span
                        >{#if simplified}<small
                                class="simplified"
                                style={`color: ${colorFor(simplified)}`}
                                >{simplified}</small
                            >{/if}{#each componentForms as form}<a
                                class="component-form"
                                href={`/component/${encodeURIComponent(form)}`}
                                onclick={(event) => openComponent(event, form)}
                                aria-label={`Open component form ${form}`}
                                style={`color: ${colorComponent(form)}`}
                                >{form}</a
                            >{/each}{/if}
                </h1>
                <div class="meta">
                    <PlayButton text={entry} /><strong>{primary.pinyin}</strong
                    ><b>·</b><strong
                        >{primary.definitions
                            .filter(
                                (definition) => !definition.startsWith("CL:"),
                            )
                            .slice(0, 1)
                            .join("; ")}</strong
                    >
                </div>
            </div>
            <aside>
                <span
                    ><small>HSK level</small><strong
                        >{primary.statistics?.hskLevel ?? "—"}</strong
                    ></span
                ><span
                    ><small>Books</small><strong
                        >{scores.books ? `#${scores.books}` : "—"}</strong
                    ></span
                ><span
                    ><small>Media</small><strong
                        >{scores.media ? `#${scores.media}` : "—"}</strong
                    ></span
                >
            </aside>
        </div>
        {#if character}<section class="etymology">
                {#if etymology?.notes}<p>
                        {#each Array.from(etymology.notes) as glyph}{#if known(glyph)}<a
                                    href={`/character/${encodeURIComponent(glyph)}`}
                                    onclick={(event) => open(event, glyph)}
                                    style={`color: ${colorFor(glyph)}`}
                                    >{glyph}</a
                                >{:else}{glyph}{/if}{/each}
                    </p>{:else}<p class="empty">
                        No etymology is available for this character.
                    </p>{/if}
            </section>{/if}{#if word || displayComponents.length}<section
                class="card"
            >
                <p class="eyebrow">Structure</p>
                <!-- <h2>
                    {word ? "Characters in this word" : "Character components"}
                </h2> -->
                <div class="components">
                    {#if word}{#each Array.from(word) as glyph}<a
                                href={`/character/${encodeURIComponent(glyph)}`}
                                onclick={(event) => open(event, glyph)}
                                ><span
                                    class="glyph"
                                    style={`color: ${colorFor(glyph)}`}
                                    >{glyph}</span
                                ><span>
                                    <!-- <strong>Character</strong> -->
                                    <small class="component-pinyin"
                                        >{pinyinFor(glyph)}</small
                                    >
                                    <small>{meaningFor(glyph)}</small>
                                </span></a
                            >{/each}{:else}{#each displayComponents as component}<a
                                href={`/component/${encodeURIComponent(component.character)}`}
                                onclick={(event) => openComponent(event, component.character)}
                                ><span
                                    class="glyph"
                                    style={`color: ${colorComponent(component.character)}`}
                                    >{component.character}</span
                                ><span
                                    ><strong
                                        >{componentTypeNames[component.type] ??
                                            component.type}</strong
                                    >
                                    {#if component.pinyin}<small
                                            class="component-pinyin"
                                            >{component.pinyin}</small
                                        >{/if}
                                    <small
                                        >{component.definition ??
                                            "Component"}</small
                                    >
                                </span></a
                            >{/each}{/if}
                </div>
            </section>{/if}{#if dictionaryMeanings.length}<section
                class="card dictionary-entries"
            >
                <p class="eyebrow">Meaning</p>
                <ul>
                    {#each visibleMeanings as meaning}
                        <li>
                            {#each Array.from(meaning) as glyph}{#if known(glyph)}<a
                                        href={`/character/${encodeURIComponent(glyph)}`}
                                        onclick={(event) => open(event, glyph)}
                                        style={`color: ${colorFor(glyph)}`}
                                        >{glyph}</a
                                    >{:else}{glyph}{/if}{/each}
                        </li>
                    {/each}
                </ul>
                {#if dictionaryMeanings.length > 4}
                    <button
                        class="toggle-meanings"
                        onclick={() => (showAllMeanings = !showAllMeanings)}
                    >
                        {showAllMeanings
                            ? "Show fewer meanings"
                            : `Show ${dictionaryMeanings.length - 4} more meanings`}
                    </button>
                {/if}
            </section>{/if}{#if character}<section class="card words">
                <p class="eyebrow">Most frequent words</p>
                {#if topWords.length}<FrequentWords
                        words={topWords}
                        {colorFor}
                        {pinyinFor}
                        onOpen={open}
                    />{:else}<p class="empty">
                        Frequency data is not available for this character.
                    </p>{/if}
            </section>{/if}{:else}<div class="not-found">
            <h1>Character not found</h1>
            <button onclick={onHome}>Browse characters</button>
        </div>{/if}
    <DictionaryPageControls {onBack} {onHome} {homeLabel} {embedded} />
</section>

<style>
    h1,
    p {
        margin-top: 0;
    }
    h1,
    h1 {
        margin-bottom: var(--space-xs);
        font-size: var(--font-size-character-detail);
        font-weight: var(--font-weight-character);
        line-height: var(--line-height-tight);
        letter-spacing: var(--letter-spacing-heading);
    }
    h1 a {
        color: inherit;
        text-decoration: none;
    }
    .hero {
        display: flex;
        justify-content: space-between;
        gap: var(--space-xl);
        margin-bottom: var(--space-xl);
    }
    .hero-text {
        flex: 1 1 0;
        min-width: 0;
    }
    .hero h1 {
        white-space: nowrap;
    }
    .eyebrow {
        margin: 0 0 var(--space-xs);
        color: var(--color-accent);
        font-size: var(--font-size-eyebrow);
        font-weight: var(--font-weight-bold);
        letter-spacing: var(--letter-spacing-eyebrow);
        text-transform: uppercase;
    }
    .simplified {
        margin-left: var(--space-sm);
        font-size: inherit;
        font-weight: var(--font-weight-character);
        vertical-align: middle;
        opacity: 0.4;
    }
    .component-form {
        margin-left: var(--space-lg);
        color: var(--color-muted);
        font-size: inherit;
        font-weight: var(--font-weight-character);
        opacity: 0.45;
        text-decoration: none;
    }
    .component-form + .component-form {
        margin-left: var(--space-xs);
    }
    .dictionary-entries ul {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-xs) var(--space-xl);
        margin: 0;
        padding-left: var(--space-lg);
    }
    .dictionary-entries li {
        line-height: 1.4rem;
    }
    .dictionary-entries a {
        color: var(--color-link);
    }
    .toggle-meanings {
        margin-top: var(--space-md);
        padding: 0;
        border: 0;
        color: var(--color-link);
        background: transparent;
        font: inherit;
        font-weight: var(--font-weight-bold);
        text-decoration: underline;
        text-underline-offset: 0.18em;
        cursor: pointer;
    }
    @media (max-width: 520px) {
        .dictionary-entries ul {
            grid-template-columns: 1fr;
        }
    }
        /* line-height: var(--line-height-body); */
    .meta {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--space-xs);
        color: var(--color-muted);
        font-size: var(--font-size-pinyin);
        font-weight: var(--font-weight-bold);
    }
    .meta strong:first-of-type {
        color: var(--color-accent);
    }
    aside {
        display: grid;
        align-self: flex-end;
        gap: var(--space-md);
        padding: var(--space-md);
        border-left: var(--border-width) solid var(--color-border);
    }
    aside span {
        display: grid;
        grid-template-columns: minmax(72px, 1fr) auto;
        align-items: baseline;
        gap: var(--space-xxs);
    }
    aside small {
        color: var(--color-muted);
        font-size: var(--font-size-small);
    }
    aside strong {
        color: var(--color-heading);
        text-align: right;
        font-size: var(--font-size-origin);
    }
    .etymology {
        max-width: var(--definition-max-width);
        margin-bottom: var(--space-xl);
    }
    .etymology p {
        color: var(--color-muted);
        font-size: var(--font-size-intro);
        line-height: var(--line-height-body);
    }
    .etymology a {
        color: var(--color-link);
    }
    .card {
        margin-bottom: var(--grid-gap);
        padding: var(--card-padding);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
    }
    .components {
        display: grid;
        grid-template-columns: repeat(
            auto-fit,
            minmax(var(--component-min-width), 1fr)
        );
        gap: var(--space-sm);
    }
    .components a {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--component-padding);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-md);
        text-decoration: none;
        transition:
            background var(--transition-fast),
            border-color var(--transition-fast),
            transform var(--transition-fast);
    }
    .components a:hover {
        transform: translateY(var(--hover-lift));
        border-color: var(--color-accent);
        background: var(--color-accent-subtle);
    }
    .glyph {
        color: var(--color-heading);
        font-size: var(--font-size-component);
    }
    .components strong {
        display: block;
        color: var(--color-heading);
    }
    .components small {
        display: block;
        margin-top: var(--space-xxs);
        color: var(--color-muted);
        font-size: var(--font-size-small);
    }
    .components .component-pinyin {
        color: var(--color-accent);
        font-weight: var(--font-weight-bold);
    }
    .empty {
        margin: 0;
        color: var(--color-muted);
        line-height: var(--line-height-body);
    }
    .not-found {
        text-align: center;
        padding: var(--not-found-padding) 0;
    }
    .not-found button {
        padding: var(--input-padding-y) var(--button-padding-x);
        border: 0;
        border-radius: var(--radius-sm);
        color: var(--color-on-accent);
        background: var(--color-accent);
        font-weight: var(--font-weight-bold);
    }
</style>
