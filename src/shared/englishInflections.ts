const IRREGULAR_LEMMAS: Record<string, string[]> = {
  am: ["be"],
  are: ["be"],
  ate: ["eat"],
  been: ["be"],
  began: ["begin"],
  begun: ["begin"],
  being: ["be"],
  bought: ["buy"],
  broke: ["break"],
  broken: ["break"],
  brought: ["bring"],
  built: ["build"],
  came: ["come"],
  caught: ["catch"],
  children: ["child"],
  chose: ["choose"],
  chosen: ["choose"],
  criteria: ["criterion"],
  data: ["datum"],
  did: ["do"],
  does: ["do"],
  doing: ["do"],
  done: ["do"],
  drank: ["drink"],
  driven: ["drive"],
  drove: ["drive"],
  drunk: ["drink"],
  eaten: ["eat"],
  fallen: ["fall"],
  feet: ["foot"],
  felt: ["feel"],
  fell: ["fall"],
  flew: ["fly"],
  flown: ["fly"],
  forgot: ["forget"],
  forgotten: ["forget"],
  found: ["find"],
  frozen: ["freeze"],
  gave: ["give"],
  geese: ["goose"],
  given: ["give"],
  goes: ["go"],
  gone: ["go"],
  got: ["get"],
  gotten: ["get"],
  grew: ["grow"],
  grown: ["grow"],
  had: ["have"],
  has: ["have"],
  held: ["hold"],
  hidden: ["hide"],
  hid: ["hide"],
  indices: ["index"],
  is: ["be"],
  knew: ["know"],
  known: ["know"],
  left: ["leave"],
  lost: ["lose"],
  made: ["make"],
  matrices: ["matrix"],
  men: ["man"],
  met: ["meet"],
  mice: ["mouse"],
  paid: ["pay"],
  people: ["person"],
  phenomena: ["phenomenon"],
  ran: ["run"],
  ridden: ["ride"],
  rode: ["ride"],
  rose: ["rise"],
  risen: ["rise"],
  said: ["say"],
  sang: ["sing"],
  sat: ["sit"],
  saw: ["see"],
  seen: ["see"],
  sent: ["send"],
  shook: ["shake"],
  shaken: ["shake"],
  spoke: ["speak"],
  spoken: ["speak"],
  stood: ["stand"],
  swam: ["swim"],
  swum: ["swim"],
  taken: ["take"],
  taught: ["teach"],
  teeth: ["tooth"],
  thought: ["think"],
  threw: ["throw"],
  thrown: ["throw"],
  told: ["tell"],
  took: ["take"],
  understood: ["understand"],
  was: ["be"],
  went: ["go"],
  were: ["be"],
  women: ["woman"],
  won: ["win"],
  wore: ["wear"],
  worn: ["wear"],
  wrote: ["write"],
  written: ["write"]
};

function isConsonant(value: string): boolean {
  return /^[a-z]$/.test(value) && !/[aeiou]/.test(value);
}

export function englishLemmaCandidates(value: string): string[] {
  const word = value.trim().toLowerCase().replace(/[’]/g, "'");
  const candidates: string[] = [];
  const add = (candidate: string) => {
    if (candidate.length >= 2 && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };
  add(word);
  IRREGULAR_LEMMAS[word]?.forEach(add);

  const possessive = word.match(/^(.+)'s$/)?.[1];
  if (possessive) add(possessive);

  if (word.endsWith("ies") && word.length > 4) {
    add(`${word.slice(0, -3)}y`);
  }
  if (word.endsWith("ves") && word.length > 4) {
    add(`${word.slice(0, -3)}f`);
    add(`${word.slice(0, -3)}fe`);
  }
  if (/(?:ches|shes|sses|xes|zes|oes)$/.test(word)) {
    add(word.slice(0, -2));
  } else if (word.endsWith("s") && !/(?:ss|us|is)$/.test(word)) {
    add(word.slice(0, -1));
  }

  if (word.endsWith("ied") && word.length > 4) {
    add(`${word.slice(0, -3)}y`);
  } else if (word.endsWith("ed") && word.length > 4) {
    const stem = word.slice(0, -2);
    add(stem);
    add(`${stem}e`);
    if (
      stem.length > 2 &&
      stem.at(-1) === stem.at(-2) &&
      isConsonant(stem.at(-1) ?? "")
    ) {
      add(stem.slice(0, -1));
    }
  }

  if (word.endsWith("ying") && word.length > 5) {
    const stem = word.slice(0, -4);
    add(`${stem}ie`);
    add(`${stem}y`);
  } else if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    add(stem);
    add(`${stem}e`);
    if (
      stem.length > 2 &&
      stem.at(-1) === stem.at(-2) &&
      isConsonant(stem.at(-1) ?? "")
    ) {
      add(stem.slice(0, -1));
    }
  }

  if (word.endsWith("ier") && word.length > 4) {
    add(`${word.slice(0, -3)}y`);
  } else if (word.endsWith("iest") && word.length > 5) {
    add(`${word.slice(0, -4)}y`);
  } else if (word.endsWith("er") && word.length > 4) {
    const stem = word.slice(0, -2);
    add(stem);
    add(`${stem}e`);
  } else if (word.endsWith("est") && word.length > 5) {
    const stem = word.slice(0, -3);
    add(stem);
    add(`${stem}e`);
  }

  return candidates;
}
