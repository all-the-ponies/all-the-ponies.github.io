import { getUrlParameter, LOC, setUrlParameter, toTitleCase } from "../scripts/common.js";
import GameData from "../scripts/gameData.js";
import '../scripts/jquery-3.7.1.min.js'

class App {
    constructor() {
        this.searchSection = $('#search-section')
        this.ponyProfileSection = $('#pony-profile')
        this.languageSelector = $('#language')
        this.searchBar = $('#search-bar')
        this.searchResultsElement = $('#search-results')

        this.searchCreated = false

        this.currentScreen = 'search'

        this.languageSelector.on('change', () => this.update())
        
        this.gameData = new GameData('/assets/json/game-data.json')
        
        this.filters = {}

        let selectedPony = getUrlParameter('pony')

        $('.to-search').on('click', (e) => {
            e.preventDefault()
            setUrlParameter('pony')
            this.updateSearch()
        })

        window.addEventListener('popstate', (e) => {
            console.log(e)
            this.reload()
        })

        this.searchBar.on('input', () => this.updateSearch())

        this.reload()
    }

    get language() {
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
    }

    reload() {
        console.log('reloading')
        let selectedPony = getUrlParameter('pony')
        
        if (selectedPony) {
            this.currentScreen = 'ponyProfile'
            this.showPonyProfile(selectedPony)
        } else {
            this.currentScreen = 'search'
        }

        const searchQuery = getUrlParameter('q')
        if (searchQuery != null) {
            this.searchBar.val(searchQuery)
        }

        if (!this.searchCreated) {
            this.createSearchCards()
        }

        if (this.currentScreen == 'search') {
            this.updateSearch()
        }
    }

    update() {
        this.gameData.language = this.language
        this.gameData.updatePonies()

        if (this.currentScreen == 'ponyProfile') {
            this.showPonyProfile(getUrlParameter('pony'))
        }
        this.createSearchCards()
        if (this.currentScreen == 'search') {
            this.updateSearch()
        }
    }

    createPonyCard(ponyId) {
        let pony = this.gameData.getPony(ponyId)
        let card = $('<a>', {
            class: 'pony-card',
            id: ponyId,
            href: `?pony=${ponyId}`,
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
                    src: pony.image.full,
                    loading: 'lazy',
                    alt: pony.name[this.language],
                })
            )
        ).on('click', (e) => {
            e.preventDefault()
            setUrlParameter('pony', ponyId)
            this.showPonyProfile(pony.id)
        })
        return card
    }

    showSearch() {
        this.currentScreen = 'search'
        this.searchSection.css('display', 'block')
        this.ponyProfileSection.css('display', 'none')
    }

    createSearchCards() {
        this.searchResultsElement.empty()
        
        for (let ponyId of Object.keys(this.gameData.ponies)) {
            if ($(`#${ponyId}`).length == 0) {
                // console.log('does not exist', $(`#${ponyId}`).length )
                this.searchResultsElement.append(this.createPonyCard(ponyId))
            }
        }
        this.searchCreated = true
    }

    updateSearch() {
        this.showSearch()

        setUrlParameter('q', this.searchBar.val(), true)


        let searchResults = this.gameData.searchName(this.searchBar.val(), true)
        // console.log(searchResults)

        this.searchResultsElement.children().each(function () {
            if (!searchResults.includes(this.id)) {
                this.style.display = 'none'
            } else {
                this.style.display = 'block'
            }
        })
    }

    showPonyProfile(ponyId) {
        this.currentScreen = 'ponyProfile'

        this.searchSection.css('display', 'none')
        this.ponyProfileSection.css('display', 'block')

        let pony = this.gameData.getPony(ponyId)
        // this.searchResultsElement.empty()


        this.ponyProfileSection.find('#pony-profile-name').text(pony.name[this.language])
        console.log(pony.image.full)
        this.ponyProfileSection.find('#pony-profile-image').attr('src', pony.image.full)
        this.ponyProfileSection.find('#pony-profile-portrait-image').attr('src', pony.image.portrait)
        this.ponyProfileSection.find('#pony-profile-description').text(pony.description[this.language])
        this.ponyProfileSection.find('[data-pony-info="level"]').text(pony.unlock_level)
        this.ponyProfileSection.find('[data-pony-info="town"]').text(toTitleCase(LOC.translate(pony.location)))
        this.ponyProfileSection.find('[data-pony-info="arrival-bonus"]').text(pony.arrival_xp)
        this.ponyProfileSection.find('[data-pony-info="House"]').text(pony.house)
        this.ponyProfileSection.find('[data-pony-info="minigame-cooldown"]').text(pony.minigame.cooldown + 's')
        this.ponyProfileSection.find('[data-pony-info="minigame-skip-cost"]').text(pony.minigame.skip_cost)

        return
        let starRewardsElement = this.ponyProfileSection.find('[data-pony-info="star-rewards"]')
        let starRewardsBar = starRewardsElement.find('.star-rewards-bar')
        if (pony.rewards.length == 0 || pony.max_level) {
            starRewardsBar.css('display', 'none')
            starRewardsElement.find('.none-star-rewards').css('display', 'inline')
        } else {
            starRewardsBar.css('display', 'flex')
            starRewardsElement.find('.none-star-rewards').css('display', 'none')
            let i = 0
            for (let i = 0; i < 5; i++) {
                let reward = pony.rewards[i]
                let item = this.gameData.getItem(reward.item)
                let img = starRewardsBar.children().eq(i).find('img')
                img.attr('src', item.image)
            }
        }
        // this.ponyProfileSection.find('[data-pony-info="minigame-skip-cost"]').text(pony.minigames.minigame_skip_cost)

    }
}

window.app = new App()
