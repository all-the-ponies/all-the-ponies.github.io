export default class Page {
    constructor() {
        this.content = document.getElementById('page-content')
        this.languageSelector = document.getElementById('language')
    }

    get language() {
        return this.languageSelector.value
    }

    async load() {
        const response = await fetch('layout.html')
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const text = await response.text()
        this.content.innerHTML = text
    }
    async reload() {}
    async update() {}
}
