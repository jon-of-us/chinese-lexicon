<script lang="ts">
    import { getPinyinCoverage, getPinyinSyllables, normalizePinyin, type PinyinRankSource } from "./dictionary";
    import FrequencySourceSelector from "./FrequencySourceSelector.svelte";
    import PlayButton from "./PlayButton.svelte";

    let { colorFor, colorForRank, hoverCharacterRank, onOpen }: { colorFor: (text: string) => string; colorForRank: (rank: number | undefined) => string; hoverCharacterRank: number; onOpen: (text: string) => void } = $props();

    const initials = ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "zh", "ch", "sh", "r"];
    const rowData = [
        "i|||||||||||||||zi|ci|si|zhi|chi|shi|ri",
        "a|a|ba|pa|ma|fa|da|ta|na|la|ga|ka|ha||||za|ca|sa|zha|cha|sha",
        "ai|ai|bai|pai|mai||dai|tai|nai|lai|gai|kai|hai||||zai|cai|sai|zhai|chai|shai",
        "an|an|ban|pan|man|fan|dan|tan|nan|lan|gan|kan|han||||zan|can|san|zhan|chan|shan|ran",
        "ang|ang|bang|pang|mang|fang|dang|tang|nang|lang|gang|kang|hang||||zang|cang|sang|zhang|chang|shang|rang",
        "ao|ao|bao|pao|mao||dao|tao|nao|lao|gao|kao|hao||||zao|cao|sao|zhao|chao|shao|rao",
        "e|e|||me||de|te|ne|le|ge|ke|he||||ze|ce|se|zhe|che|she|re",
        "ei|ei|bei|pei|mei|fei|dei||nei|lei|gei||hei||||zei|||zhei||shei",
        "en|en|ben|pen|men|fen|||nen||gen|ken|hen||||zen|cen|sen|zhen|chen|shen|ren",
        "eng|eng|beng|peng|meng|feng|deng|teng|neng|leng|geng|keng|heng||||zeng|ceng|seng|zheng|cheng|sheng|reng",
        "er|er||||||||||||||||||||",
        "i|yi|bi|pi|mi||di|ti|ni|li|||ji|qi|xi|||||||",
        "ia|ya|||||dia|||lia|||jia|qia|xia|||||||",
        "ian|yan|bian|pian|mian||dian|tian|nian|lian|||jian|qian|xian|||||||",
        "iang|yang|||||||niang|liang|||jiang|qiang|xiang|||||||",
        "iao|yao|biao|piao|miao||diao|tiao|niao|liao|||jiao|qiao|xiao|||||||",
        "ie|ye|bie|pie|mie||die|tie|nie|lie|||jie|qie|xie|||||||",
        "in|yin|bin|pin|min||||nin|lin|||jin|qin|xin|||||||",
        "ing|ying|bing|ping|ming||ding|ting|ning|ling|||jing|qing|xing|||||||",
        "iong|yong|||||||||||jiong|qiong|xiong|||||||",
        "iou|you|||miu||diu||niu|liu|||jiu|qiu|xiu|||||||",
        "o|o|bo|po|mo|fo||||||||||||||||",
        "ong||||dong|tong|nong|long|gong|kong|hong||||zong|cong|song|zhong|chong| |rong",
        "ou|ou||pou|mou|fou|dou|tou||lou|gou|kou|hou||||zou|cou|sou|zhou|chou|shou|rou",
        "u|wu|bu|pu|mu|fu|du|tu|nu|lu|gu|ku|hu||||zu|cu|su|zhu|chu|shu|ru",
        "ua|wa||||||||gua|kua|hua|||||||zhua||shua|",
        "uai|wai||||||||guai|kuai|huai|||||||zhuai|chuai|shuai|",
        "uan|wan||||duan|tuan|nuan|luan|guan|kuan|huan||||zuan|cuan|suan|zhuan|chuan|shuan|ruan",
        "uang|wang||||||||guang|kuang|huang|||||||zhuang|chuang|shuang|",
        "uei|wei||||dui|tui||gui|kui|hui||||zui|cui|sui|zhui|chui|shui|rui",
        "uen|wen||||dun|tun||lun|gun|kun|hun||||zun|cun|sun|zhun|chun|shun|run",
        "ueng|weng||||||||||||||||||||",
        "uo|wo||||duo|tuo|nuo|luo|guo|kuo|huo||||zuo|cuo|suo|zhuo|chuo|shuo|ruo",
        "ü|yu|||||||nü|lü|||ju|qu|xu|||||||",
        "üan|yuan|||||||||||juan|quan|xuan|||||||",
        "üe|yue|||||||nüe|lüe|||jue|que|xue|||||||",
        "ün|yun|||||||||||jun|qun|xun|||||||",
    ];
    const rows = rowData.map((row) => {
        const cells = row.split("|").map((cell) => cell.trim());
        const [final, ...syllables] = cells;
        const initialFor = (syllable: string) => [...initials.slice(1)].sort((left, right) => right.length - left.length).find((initial) => syllable.startsWith(initial)) ?? "";
        return [final, ...initials.map((initial) => syllables.find((syllable) => initialFor(syllable) === initial) ?? "")];
    });
    const finals = rows.map((row) => row[0]);
    const coverage = $derived(getPinyinCoverage(initials.slice(1), finals));
    let rankSource = $state<PinyinRankSource>("media");
    const syllables = $derived(getPinyinSyllables(rankSource));
    const syllableByName = $derived(new Map(syllables.map((item) => [item.syllable, item])));
    const rankByName = $derived(new Map(syllables.map((item, index) => [item.syllable, index + 1])));
    let selectedName = $state<string | null>(null);
    let hoveredName = $state<string | null>(null);
    const selected = $derived(selectedName ? syllableByName.get(selectedName) : undefined);

    function select(event: MouseEvent, name: string) {
        event.stopPropagation();
        selectedName = normalizePinyin(name);
    }

    function hoverCharacters(name: string) {
        return syllableByName.get(normalizePinyin(name))?.characters.filter((item) => (item.rank ?? Infinity) <= hoverCharacterRank).slice(0, 12) ?? [];
    }

    function clearSelection(event: MouseEvent) {
        if (!(event.target as HTMLElement).closest(".syllable, .results")) selectedName = null;
    }

    function showHoverMenu(name: string) {
        hoveredName = normalizePinyin(name);
    }

    function hideHoverMenu(name: string) {
        if (hoveredName === normalizePinyin(name)) hoveredName = null;
    }

    function coverageLabel(kind: "initial" | "final", value: string) {
        const frequency = coverage[kind].get(value) ?? 0;
        const percentage = coverage.total ? (frequency / coverage.total) * 100 : 0;
        const label = value || "no initial";
        return `${kind === "initial" ? "Initial" : "Final"} ${label}: ${percentage.toFixed(1)}% of character frequency`;
    }

    function open(event: MouseEvent, character: string) {
        event.preventDefault();
        onOpen(character);
    }
</script>

<svelte:window onclick={clearSelection} />

<section class="page">
    <header class="intro">
        <p class="eyebrow">Pronunciation</p>
        <h1>Pinyin table</h1>
        <p>Explore every Mandarin syllable, colored by the combined frequency of its characters.</p>
    </header>

    <section class="table-card" aria-label="Pinyin syllables">
        <div class="rank-selector"><FrequencySourceSelector value={rankSource} includeDong={false} onChange={(source) => { rankSource = source as PinyinRankSource; selectedName = null; }} /></div>
        <div class="table-scroll">
            <table>
                <thead><tr><th scope="col" aria-label="Final"></th>{#each initials as initial}<th class="coverage-header" scope="col" data-coverage={coverageLabel("initial", initial)}>{initial}</th>{/each}</tr></thead>
                <tbody>
                    {#each rows as row}
                        <tr>
                            <th class="coverage-header" scope="row" data-coverage={coverageLabel("final", row[0])}>{row[0]}</th>
                            {#each row.slice(1) as name, columnIndex}
                                  <td class:left-edge={columnIndex < 4} class:right-edge={columnIndex > initials.length - 5}>{#if name && syllableByName.has(normalizePinyin(name))}<div class="syllable" role="group" style={`background: ${colorForRank(rankByName.get(normalizePinyin(name)))}`} onmouseenter={() => showHoverMenu(name)} onmouseleave={() => hideHoverMenu(name)}><button class:selected={selectedName === normalizePinyin(name)} onclick={(event) => select(event, name)}>{name}</button>{#if (selectedName === normalizePinyin(name) || (!selectedName && hoveredName === normalizePinyin(name))) && hoverCharacters(name).length}<div class="hover-menu" aria-label={`Common characters pronounced ${name}`}>{#each hoverCharacters(name) as item}<div class="hover-character"><span class="audio-slot"><PlayButton text={item.character} pinyin={item.pinyin} /></span><a href={`/character/${encodeURIComponent(item.character)}`} onclick={(event) => open(event, item.character)}><strong style={`color: ${colorForRank(item.rank)}`}>{item.character}</strong><span>{item.pinyin}</span><small>{item.definition}</small></a></div>{/each}</div>{/if}</div>{/if}</td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>

    {#if selected}
        <section class="results" aria-live="polite">
            <div class="results-heading"><div><p class="eyebrow">Syllable</p><h2 style={`color: ${colorForRank(rankByName.get(selected.syllable))}`}>{selected.syllable}</h2></div><span>{selected.frequency.toLocaleString()} combined uses</span></div>
            <div class="character-list">
                {#each selected.characters.slice(0, 30) as item}
                    <div class="character-row">
                        <a class="character-link" href={`/character/${encodeURIComponent(item.character)}`} onclick={(event) => open(event, item.character)}>
                        <strong style={`color: ${colorForRank(item.rank)}`}>{item.character}</strong>
                        <span class="meaning"><b>{item.pinyin}</b>{item.definition}<small>#{item.rank ?? "—"}</small></span>
                        </a>
                        <PlayButton text={item.character} pinyin={item.pinyin} />
                    </div>
                {/each}
            </div>
        </section>
    {:else if selectedName}<p class="empty">No syllable connected.</p>{/if}
</section>

<style>
    .page { display: grid; gap: var(--space-lg); }
    .intro { max-width: var(--heading-max-width); }
    h1, h2, p { margin: 0; }
    h1 { margin-top: var(--space-xs); color: var(--color-heading); font-size: clamp(2.2rem, 5vw, 4rem); line-height: var(--line-height-tight); letter-spacing: var(--letter-spacing-heading); }
    h2 { margin-top: var(--space-xs); font-size: 3rem; line-height: 1; }
    .intro > p:last-child { max-width: var(--intro-max-width); margin-top: var(--space-sm); color: var(--color-muted); font-size: var(--font-size-body); }
    .eyebrow { color: var(--color-accent); font-size: var(--font-size-eyebrow); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-eyebrow); text-transform: uppercase; }
    .table-card, .results { border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
    .rank-selector { padding: var(--space-xs); border-bottom: var(--border-width) solid var(--color-border); }
    .table-scroll { overflow-x: auto; padding: var(--space-xs); }
    table { min-width: 980px; border-collapse: separate; border-spacing: 2px; background: #fff; }
    th, td { width: 42px; height: 30px; padding: 0; text-align: center; }
    thead th { height: 24px; color: var(--color-muted); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }
    tbody th { color: var(--color-heading); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); text-align: left; }
    .coverage-header { position: relative; cursor: help; }
    .coverage-header:hover::after { position: absolute; z-index: 3; top: calc(100% + 4px); left: 50%; width: max-content; max-width: 180px; padding: 4px 6px; border-radius: 3px; color: var(--color-on-accent); background: var(--color-heading); content: attr(data-coverage); font-size: .65rem; font-weight: 400; line-height: 1.2; text-align: left; transform: translateX(-50%); }
    tbody .coverage-header:hover::after { top: 50%; left: calc(100% + 4px); transform: translateY(-50%); }
    td { position: relative; }
    .syllable { position: relative; width: 100%; height: 100%; border-radius: 3px; }
    td button { width: 100%; height: 100%; padding: 0; border: 0; border-radius: inherit; background: transparent; color: #fff; font-size: var(--font-size-small); font-weight: var(--font-weight-bold); text-shadow: 0 1px 1px rgb(0 0 0 / 25%); }
    td button:hover { outline: 2px solid rgb(255 255 255 / 72%); outline-offset: 1px; }
    td button.selected { outline: 3px solid #fff; outline-offset: 1px; }
    .hover-menu { position: absolute; z-index: 2; top: calc(100% + 4px); left: 50%; display: none; width: 280px; max-height: 360px; padding: var(--space-xxs); overflow-y: auto; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); box-shadow: 0 8px 18px rgb(25 23 20 / 18%); transform: translateX(-50%); }
    .hover-menu { display: grid; gap: 2px; }
    .left-edge .hover-menu { left: 0; transform: none; }
    .right-edge .hover-menu { left: 100%; transform: translateX(-100%); }
    .hover-character { display: grid; grid-template-columns: 1rem 1fr; align-items: center; gap: 4px; min-height: 42px; padding: 3px; border-radius: 3px; }
    .audio-slot { display: grid; width: 1rem; height: 1rem; place-items: center; }
    .hover-character:hover { background: var(--color-accent-subtle); }
    .hover-menu a { display: grid; grid-template-columns: 1.6rem 3rem minmax(0, 1fr); align-items: center; column-gap: 4px; min-width: 0; color: var(--color-heading); text-decoration: none; }
    .hover-menu strong { font-size: 1.45rem; font-weight: var(--font-weight-character); line-height: 1; }
    .hover-menu span { color: var(--color-heading); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }
    .hover-menu small { display: -webkit-box; overflow: hidden; color: var(--color-muted); font-size: .65rem; line-height: 1.2; line-clamp: 2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .results { padding: var(--space-lg); }
    .results-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-md); padding-bottom: var(--space-md); border-bottom: var(--border-width) solid var(--color-border-subtle); }
    .results-heading > span { color: var(--color-muted); font-size: var(--font-size-small); }
    .character-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--space-xs); padding-top: var(--space-md); }
    .character-row { display: flex; align-items: center; gap: var(--space-sm); min-width: 0; padding: var(--space-sm); border-radius: var(--radius-sm); }
    .character-row:hover { background: var(--color-accent-subtle); }
    .character-link { display: flex; align-items: center; gap: var(--space-sm); flex: 1; min-width: 0; text-decoration: none; }
    .character-row strong { font-size: 2rem; font-weight: var(--font-weight-character); line-height: 1; }
    .meaning { display: grid; flex: 1; color: var(--color-muted); font-size: var(--font-size-small); }
    .meaning b { color: var(--color-heading); font-weight: var(--font-weight-bold); }
    .meaning small { font-size: .68rem; }
    .empty { color: var(--color-muted); }
</style>