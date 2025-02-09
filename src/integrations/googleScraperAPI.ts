import type { Definition, DefinitionProvider, DictionaryWord, PartOfSpeech, Synonym, SynonymProvider } from "src/integrations/types";
import { requestUrl } from "obsidian";

class Base {
  name = "Google";
  url?: "https://support.google.com/websearch/answer/10106608";
  offline = false;
  supportedLanguages = [
      "en_US",
      "de",
      "es",
      "fr"
  ];

  static LANGUAGES = {
      'en_US': 'english',
      'de': 'deutsch',
      "es": "Español",
      "fr": "Français"
  }
}

export class GoogleScraperDefinitionProvider extends Base implements DefinitionProvider {
    async requestDefinitions(query: string, lang: string): Promise<DictionaryWord> {
        const result = await requestUrl({
            url: `https://www.google.com/search?q=${query.replace(/\s/g, '+')}+meaning+in+${GoogleScraperDefinitionProvider.LANGUAGES[lang]}`,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36' }
        });
        console.log(result);

        const doc = new DOMParser().parseFromString(result.text, 'text/html');
        const data = doc.querySelector(`div[data-query-term="${query}"]`);

        if (!data) throw "";

        const def: DictionaryWord = {
            phonetics: [],
            meanings: [],
            word: data.querySelector('span[data-dobid="hdw"]')?.textContent ?? query
        };
        def.word = def.word.replaceAll('·', '');

        //Something like eɪpr(ɪ)l (April)
        const phoneticText = data.querySelector('.LTKOO > span')?.textContent;
        if (phoneticText) {
            def.phonetics.push({
                text: phoneticText,
                audio: data.querySelector('audio > source')?.getAttribute('src') ?? undefined
            });
        }

        //Something like noun
        // const type = data.querySelector('.vmod i')?.textContent;
        const types = data.querySelectorAll('.vmod i');

        const defGenerator = (defs: NodeList) => {
            const out: Definition[] = [];
            const syns: string[] = [];
            const tmp = data.querySelectorAll('.lr_container div[role="button"] span');
            tmp.forEach((el) => {
                if (!el.parentElement?.getAttribute('data-topic') && el.textContent) {
                    syns.push(el.textContent.trim());
                }
            })
            defs.forEach((el, idx) => {
                out.push({
                    definition: el.textContent,
                    example: el.nextSibling?.textContent,
                    synonyms: !idx ? syns : undefined
                })
            })
            return out;
        }

        if (types.length > 0) {
            for (const type of types) {
                if (!type) continue;

                def.meanings.push({
                    partOfSpeech: type?.textContent,
                    definitions: defGenerator(type.closest('.vmod').querySelectorAll('div[data-dobid="dfn"]'))
                });
            }
        } else {
            def.meanings.push({
                partOfSpeech: undefined,
                definitions: defGenerator(data.querySelectorAll('div[data-dobid="dfn"]'))
            });
        }

        return def;
    }
}

export class GoogleScraperSynonymProvider extends Base implements SynonymProvider {
  provider: GoogleScraperDefinitionProvider;
  constructor() {
      super();
      this.provider = new GoogleScraperDefinitionProvider();
  }

  async requestSynonyms(query: string, lang: string, _?: PartOfSpeech): Promise<Synonym[]> {
      return (await this.provider.requestDefinitions(query, lang)).meanings.first().definitions.first().synonyms.map<Synonym>(synonym => { return { word: synonym } });
  }
}