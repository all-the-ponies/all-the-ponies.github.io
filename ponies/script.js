import GameData from "../scripts/gameData.js";
import '../scripts/jquery-3.7.1.min.js'

class App {
    constructor() {
        this.languageSelector = $('#language')
        this.searchBar = $('#search')
        this.searchResultsElement = $('#search-results')
        
        this.gameData = new GameData('/assets/json/game-data.json')
        
        this.filters = {}

        this.updateSearch()
    }

    get language() {
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
    }

    createPonyCard(ponyId) {
        let pony = this.gameData.getPony(ponyId)
        let card = $('<div>', {
            class: 'pony-card',
            id: ponyId,
        }).append(
            $('<div>', {
                class: 'pony-name',
                text: pony.name[this.language],
            }),
            $('<div>', {
                class: 'pony-card-body',
            }).append(
                $('<img>', {
                    class: 'pony-image',
                    src: `/assets/images/ponies/shop/${pony.id}.png`,
                    loading: 'lazy',
                })
            )
        )
        return card
    }

    updateSearch() {
        let i = 0
        for (let ponyId of Object.keys(this.gameData.gameData.ponies)) {
            this.searchResultsElement.append(this.createPonyCard(ponyId))
            // i += 1
            // if (i > 10) {
            //     break
            // }
        }
    }
}

window.app = new App()
