import type { DictionaryWord } from "src/integrations/types";
import type DictionaryPlugin from "src/main";
import t from "src/l10n/helpers";

export default class LocalDictionaryBuilder {
    plugin: DictionaryPlugin;

    constructor(plugin: DictionaryPlugin) {
        this.plugin = plugin;
    }

    private cap(string: string): string{
        const words = string.split(" ");

        return words.map((word) => { 
            return word[0].toUpperCase() + word.substring(1); 
        }).join(" ");
    }

    async newNote(content: DictionaryWord): Promise<void> {

        let phonetics = '';
        content.phonetics.forEach((value, i, a) => {
            phonetics += '- ' + value.text;
            if(i!=a.length-1){
                phonetics += '\n';
            }
        });

        let meanings = '';
        content.meanings.forEach((value) => {
            meanings += '### ' + this.cap(value.partOfSpeech) + '\n\n';
            value.definitions.forEach((def, j, b) => {
                meanings += def.definition+ '\n\n';
                if(def.example){
                    meanings += '> ' + def.example + '\n\n';
                }
                if(def.synonyms && def.synonyms.length!=0){
                    def.synonyms.forEach((syn, i, a) => {
                        meanings += syn;
                        if(i!=a.length-1){
                            meanings += ', ';
                        }
                    })
                    meanings += '\n\n'
                }
                if(j!=b.length-1){
                    meanings += '---\n\n';
                }
            });
        });
        
        const file = await this.plugin.app.vault.create(`${this.plugin.settings.folder ? this.plugin.settings.folder + '/': ''}${this.cap(content.word)}.md`, `---
# ${t('Autogenerated by Obsidian Dictionary Plugin')}
---

# ${this.cap(content.word)}

## ${t('Pronunciation')}

${phonetics}

## ${t('Meanings')}

${meanings}
`
        );
        
        const leaf = this.plugin.app.workspace.splitActiveLeaf();
        leaf.openFile(file);
        this.plugin.app.workspace.setActiveLeaf(leaf);
    }
}
