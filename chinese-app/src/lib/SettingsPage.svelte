<script lang="ts">
    import type { DifficultySettings } from "./settings";
    import FrequencySourceSelector from "./FrequencySourceSelector.svelte";
    import PageControls from "./PageControls.svelte";
    import type { TrainingSettings } from "./training-settings";

    let {
        settings,
        trainingSettings,
        onUpdate,
        onTrainingUpdate,
        onBack,
    }: {
        settings: DifficultySettings;
        trainingSettings: TrainingSettings;
        onUpdate: (settings: DifficultySettings) => void;
        onTrainingUpdate: (settings: TrainingSettings) => void;
        onBack: () => void;
    } = $props();
</script>

<section class="settings-page">
    <h1 class="sr-only">Settings</h1>
    <section class="settings-group" aria-labelledby="dictionary-settings">
        <div class="group-heading">
            <h2 id="dictionary-settings">Dictionary</h2>
            <p>Choose how characters are ordered and coloured.</p>
        </div>
        <div class="setting-row">
            <span class="setting-label">Order characters by</span
            ><FrequencySourceSelector
                value={settings.order}
                onChange={(order) => onUpdate({ ...settings, order })}
            />
        </div>
        <div class="setting-row">
            <span class="setting-label">Colour characters by</span
            ><FrequencySourceSelector
                value={settings.source}
                includeHsk={false}
                onChange={(source) => {
                    if (source !== "hsk") onUpdate({ ...settings, source });
                }}
            />
        </div>
        <label class="range"
            ><span
                ><strong>Colour range</strong><output
                    >{settings.range.toLocaleString()} ranks</output
                ></span
            ><input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={settings.range}
                oninput={(event) =>
                    onUpdate({
                        ...settings,
                        range: Number(event.currentTarget.value),
                    })}
            /></label
        >
        <label class="range"
            ><span
                ><strong>Pinyin hover rank</strong><output
                    >Top {settings.pinyinHoverRank.toLocaleString()}</output
                ></span
            ><input
                type="range"
                min="100"
                max="3000"
                step="100"
                value={settings.pinyinHoverRank}
                oninput={(event) =>
                    onUpdate({
                        ...settings,
                        pinyinHoverRank: Number(event.currentTarget.value),
                    })}
            /></label
        >
    </section>
    <section class="settings-group" aria-labelledby="navigation-settings">
        <div class="group-heading">
            <h2 id="navigation-settings">Navigation</h2>
            <p>Choose where Back goes after opening a detail from Search, and how detail pages sit side by side.</p>
        </div>
        <label class="navigation-setting">
            <span class="setting-label">Back from search results</span>
            <select
                value={settings.searchBackBehavior}
                onchange={(event) =>
                    onUpdate({
                        ...settings,
                        searchBackBehavior: event.currentTarget.value as DifficultySettings["searchBackBehavior"],
                    })}
            >
                <option value="restore-search">Return to Search and keep the query</option>
                <option value="skip-search">Skip Search and return to the previous detail or start page</option>
            </select>
        </label>
        <label class="range"
            ><span
                ><strong>Minimum pane width</strong><output
                    >{settings.paneMinWidth} px</output
                ></span
            ><input
                type="range"
                min="320"
                max="1200"
                step="20"
                value={settings.paneMinWidth}
                oninput={(event) =>
                    onUpdate({
                        ...settings,
                        paneMinWidth: Number(event.currentTarget.value),
                    })}
            /></label
        >
        <label class="range"
            ><span
                ><strong>Maximum detail panes</strong><output
                    >{settings.maxPanes}</output
                ></span
            ><input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.maxPanes}
                oninput={(event) =>
                    onUpdate({
                        ...settings,
                        maxPanes: Number(event.currentTarget.value),
                    })}
            /></label
        >
    </section>
    <section class="settings-group" aria-labelledby="detail-settings">
        <div class="group-heading">
            <h2 id="detail-settings">Detail pages</h2>
            <p>Size of the main character or word shown at the top of each detail page. Long words shrink to fit on one line.</p>
        </div>
        <label class="range"
            ><span
                ><strong>Headline size</strong><output
                    >{settings.detailHeadlineSize} px</output
                ></span
            ><input
                type="range"
                min="64"
                max="288"
                step="8"
                value={settings.detailHeadlineSize}
                oninput={(event) =>
                    onUpdate({
                        ...settings,
                        detailHeadlineSize: Number(event.currentTarget.value),
                    })}
            /></label
        >
    </section>
    <section
        class="settings-group training-settings"
        aria-labelledby="training-settings-heading"
    >
        <div class="group-heading">
            <h2 id="training-settings-heading">Sentence training</h2>
            <p>Set the session length and reading sizes.</p>
        </div>
        <label
            ><span
                ><strong>Sentences per session</strong><output
                    >{trainingSettings.sessionLength}</output
                ></span
            ><input
                type="range"
                min="1"
                max="50"
                step="1"
                value={trainingSettings.sessionLength}
                oninput={(event) =>
                    onTrainingUpdate({
                        ...trainingSettings,
                        sessionLength: Number(event.currentTarget.value),
                    })}
            /></label
        >{#each [["Chinese sentence", "sentenceFontSize"], ["Pinyin", "pinyinFontSize"], ["Translations", "wordTranslationFontSize"]] as [label, field]}<label
                ><span
                    ><strong>{label} size</strong><output
                        >{trainingSettings[field as keyof TrainingSettings]} rem</output
                    ></span
                ><input
                    type="range"
                    min="0.7"
                    max="5"
                    step="0.1"
                    value={trainingSettings[field as keyof TrainingSettings]}
                    oninput={(event) =>
                        onTrainingUpdate({
                            ...trainingSettings,
                            [field]: Number(event.currentTarget.value),
                        })}
                /></label
            >{/each}
        <label
            ><span><strong>Word detail rank</strong></span><select
                value={trainingSettings.wordDetailRankSource}
                onchange={(event) =>
                    onTrainingUpdate({
                        ...trainingSettings,
                        wordDetailRankSource: event.currentTarget
                            .value as TrainingSettings["wordDetailRankSource"],
                    })}
                ><option value="media">Media rank</option><option value="books"
                    >Book rank</option
                ><option value="dong">Dong Chinese rank</option><option
                    value="hsk">HSK level</option
                ></select
            ></label
        >
    </section>
    <PageControls
        controls={[{ label: "Back", onClick: onBack, primary: true }]}
    />
</section>

<style>
    .settings-page {
        max-width: var(--search-results-max-width);
        padding-bottom: var(--space-bottom);
    }
    .settings-group {
        display: grid;
        gap: var(--space-md);
        margin-bottom: var(--space-xl);
        padding: var(--card-padding);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
    }
    .group-heading h2 {
        margin: 0;
        color: var(--color-heading);
        font-size: var(--font-size-h3);
    }
    .group-heading p {
        margin: var(--space-xs) 0 0;
        color: var(--color-muted);
        line-height: var(--line-height-body);
    }
    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-md);
    }
    .setting-label {
        color: var(--color-heading);
        font-weight: var(--font-weight-bold);
    }
    .navigation-setting {
        display: grid;
        gap: var(--space-sm);
    }
    .navigation-setting select {
        width: 100%;
        padding: var(--input-padding-y) var(--input-padding-x);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-input);
        color: var(--color-text);
    }
    .range,
    .training-settings label {
        display: grid;
        gap: var(--space-sm);
        padding: var(--space-md);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-sm);
    }
    .range > span,
    .training-settings label > span {
        display: flex;
        justify-content: space-between;
        gap: var(--space-md);
    }
    .range output,
    .training-settings output {
        color: var(--color-accent);
        font-weight: var(--font-weight-bold);
    }
    .range input,
    .training-settings input {
        width: 100%;
        accent-color: var(--color-accent);
    }
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
    }
    @media (max-width: 680px) {
        .setting-row {
            align-items: flex-start;
            flex-direction: column;
        }
    }
</style>
