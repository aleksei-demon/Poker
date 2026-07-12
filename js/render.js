/*
=====================================================================================
 RENDER.JS - отрисовка экранов
=====================================================================================
Порядок подключения: 
1. aprender.js      (библиотека: h, factory, clear)
2. utils.js         (форматирование, работа со строками)
3. game-func.js     (функции игры)
4. game-logic.js    (машина, логика работы)
5. render.js        (чертежи компонентов и отрисовка экранов)

*/
// _____________________________________________________________________________________
// - - - - -И Н Т Е Р Ф Е Й С  - - - 
const myFields = [
    // Б А Н К   И   Б А Л А Н С
    {
        class: 'money',
        children: [
            { tag: 'span', innerText: 'БАНК ' },
            { tag: 'span#bank', innerText: ' 0 $ ' },
            { tag: 'span', innerText: ' | ' },
            { tag: 'span', innerText: 'БЮДЖЕТ ' },
            { tag: 'span#p-balance', innerText: ' 100 $' },
        ]
    },

    // Б О Т Ы   ( О Б Щ А Я   С Е К Ц И Я )
    {
        tag: 'section', class: 'bots-section',
        children: [
            // БОТ 1 (Андрей / Михалыч)
            {
                id: 'bot-1',
                class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.gender-marker' }, // <-- Голубой кружок ИЗ ПРОГРАММЫ
                    { tag: 'span.white', innerText: 'загрузка... ' },
                    { tag: 'span#bot-balance-1', innerText: '100$' },
                    { tag: 'div#cards-1.bot', children: [{ tag: 'span' }] },
                ]
            },
            // БОТ 2 (Ветал)
            {
                id: 'bot-2', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.gender-marker' }, // <-- Голубой кружок БЕЗ ХАРДКОДА
                    { tag: 'span.white', innerText: 'загрузка... ' },
                    { tag: 'span#bot-balance-2', innerText: '100$' },
                    { tag: 'div#cards-2.bot', children: [{ tag: 'span' }] },
                ]
            },
            // БОТ 3 (404)
            {
                id: 'bot-3', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.gender-marker' }, // <-- Розовый кружок ДА ДА))
                    { tag: 'span.white', innerText: 'загрузка... ' },
                    { tag: 'span#bot-balance-3', innerText: '100$' },
                    { tag: 'div#cards-3.bot', children: [{ tag: 'span' }] },
                ]
            },
        ]
    },

    // О Б Щ И Й   С Т О Л
    { tag: 'section', class: 'cards-table', children: [{ tag: 'div.#board' }] },

    // И Г Р О К
    { tag: 'section', class: 'player', children: [{ tag: 'div.dealer-chip', innerText: 'D' }, { tag: 'p#cards-p' }] },

    // Р Е Г У Л Я Т О Р   С Т А В О К (Полностью очищен от инлайн-стилей)
    {
        tag: 'div#raise-slider-container',
        children: [
            {
                tag: 'div.slider-title-block',
                children: [
                    { tag: 'span', innerText: 'Рейз до: ' },
                    { tag: 'span#slider-value', innerText: '0' },
                    { tag: 'span', innerText: ' $' }
                ]
            },
            {
                tag: 'input#raise-range-slider',
                attr: { type: 'range', min: '0', max: '100', step: '5' }
            },
            {
                tag: 'div.slider-labels-block',
                children: [
                    { tag: 'span#slider-min-label', innerText: 'Мин' },
                    { tag: 'span#slider-max-label', innerText: 'Макс' }
                ]
            }
        ]
    },

    // К Н О П К И
    {
        tag: 'section',
        class: 'button-panel',
        children: [
            { tag: 'button#btn-fold.btn-fold', attr: { type: "button" }, onclick: () => makeAction('fold'), innerText: 'Пасс' },
            { tag: 'button#btn-check.btn-check', attr: { type: "button" }, onclick: () => makeAction('check'), innerText: 'Чек' },
            { tag: 'button#btn-call.btn-call', attr: { type: "button" }, onclick: () => makeAction('call'), innerText: 'Колл' },
            { tag: 'button#btn-raise.btn-raise', attr: { type: "button" }, onclick: () => makeAction('raise'), innerText: 'Рейз' },
            { tag: 'button#btn-allin.btn-all-in', attr: { type: "button" }, onclick: () => makeAction('all-in'), innerText: 'Ва-банк' },
            // { tag: 'button#btn-hod.btn-hod', attr: { type: "button" }, onclick: () => makeAction('hod'), innerText: 'Ход' },
        ]
    },
];

// 3. Запуск:
const container = h('div#app', {}, factory(myFields, nestedBlueprint));
document.body.appendChild(container);

// - - - - -И Н Т Е Р Ф Е Й С  - - - 
//===================================================================================================


//_______________________________________________________________
// - - - Р Е Н Д Е Р   К А Р Т  - - -


function renderCardsTo(cardsArray, target_id, isSecret = false) {
    // 1. ЖЕСТКАЯ ЗАЩИТА: Если селектор не передан, пустой или не является строкой
    if (!target_id || typeof target_id !== 'string') {
        console.warn(`[RENDER БЛОКЕР]: Функция renderCardsTo вызвана с некорректным target_id:`, target_id);
        return;
    }

    const container = document.querySelector(target_id);
    if (!container) {
        console.error(`[RENDER ERROR]: Элемент "${target_id}" не найден в DOM стола!`);
        return;
    }

    // --- АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ В МАССИВЫ ДЛЯ АНАЛИЗА ---
    if (target_id === '#board') {
        if (!PokerEngine.gameState.board) { PokerEngine.gameState.board = []; }

        // ХИТРАЯ ОЧИСТКА ДЛЯ БОРДА:
        // Если это ФЛОП (пришло 3 карты), очищаем стол от старых раздач.
        // Если это ТЁРН или РИВЕР (пришло меньше 3 карт, например, докидываем по одной), 
        // то innerHTML НЕ очищаем, чтобы не стереть флоп!
        if (cardsArray.length >= 3) {
            container.innerHTML = '';
        }
    } else {
        let targetPlayerId;
        if (target_id === '#cards-p') {
            targetPlayerId = 'player';
        } else {
            targetPlayerId = `bot-${target_id.replace('#cards-', '')}`;
        }

        if (typeof players !== 'undefined' && Array.isArray(players)) {
            const foundPlayer = players.find(p => p.id === targetPlayerId);
            if (foundPlayer) {
                foundPlayer.cards = [...cardsArray];
                console.log(`[DATA ENGINE]: Карты для ${foundPlayer.name} сохранены в память:`, foundPlayer.cards);
            }
        }

        // ДЛЯ ИГРОКОВ И БОТОВ: Очищаем контейнер всегда, у них всегда ровно 2 карты
        container.innerHTML = '';
    }
    // -----------------------------------------------------

    // Отрисовка спанов карт (добавление в container)
    cardsArray.forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('card');

        const isRed = char === char.toUpperCase();
        span.dataset.color = isRed ? 'red' : 'black';

        if (isSecret) {
            span.classList.add('card-back');
        } else {
            span.classList.add('card-front');
        }
        container.appendChild(span);
    });
}
// - - - Р Е Н Д Е Р   К А Р Т  - - -
//==============================================================================



//__________________________________________________________________________________________________________
// - - - Ф А В И К О Н - - - 
function Favicon() {
    let iconContent = `
            <path d="M 50 15 C 75 40, 90 60, 75 75 
            S 55 70, 50 70 
            S 25 70, 25 75 
            S 10 60, 25 40
            C 35 25, 45 15, 50 15
            M 42 70
            C 42 85, 42 90, 35 90
            M 58 70
            C 58 85, 58 90, 65 90" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="10" 
            stroke-linecap="round" 
            stroke-linejoin="round"/>`;

    const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <style>            svg { color: #1a1a1a; } 
            @media (prefers-color-scheme: dark) {svg { color: #f0f0f0; }}
        </style>
        ${iconContent}
    </svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
    }
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svgIcon);
}
document.addEventListener('DOMContentLoaded', () => { Favicon(); });

// - - - Ф А В И К О Н - - - 

