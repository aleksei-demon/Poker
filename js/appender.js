/*
================================================================================
📗 ДОКУМЕНТАЦИЯ APRENDER.JS (v3.7 — Семантическая Матрица, 2026)
================================================================================

Порядок подключения: 
1. aprender.js (библиотека: h, factory, clear)
2. utils.js    (форматирование, работа со строками)
3. api.js      (async/fetch — связь с сервером)
4. logic.js    (массивы данных и математические формулы)
5. render.js   (чертежи компонентов и отрисовка экранов)

--------------------------------------------------------------------------------
1. ФУНКЦИЯ h (Hyperscript) — Атомарное создание элементов
--------------------------------------------------------------------------------
Синтаксис: h('tag#id.class', { props }, [ children ])
Или чистый тег: h('tag', { id, className, attr: {}, ... }, [ children ])

--------------------------------------------------------------------------------
2. ФУНКЦИЯ factory — Конвейерная сборка и Рекурсивный Рендеринг
--------------------------------------------------------------------------------
Синтаксис: factory(dataArray, blueprint)
Принимает массив (список или матрешку) и разворачивает его в чистый DOM по чертежу.

--------------------------------------------------------------------------------
3. СЕМАНТИЧЕСКАЯ МАТРЕШКА (Константа myFields)
--------------------------------------------------------------------------------
Структура данных полностью определяет HTML-дерево. Любой контейнер (section, form) 
может быть родителем. Поля ввода (input) или списки (select) могут быть детьми любого уровня.

Синтаксическая модель данных:

const myFields = [
    // Ветка 1: Мнемоническая запись структуры
    [
        { tag: 'section', class: 'wrapper' }, 
        [
            [
                { tag: 'form', id: 'main-form' }, 
                [
                    { tag: 'input', id: 'otvet', hold: ' ответ', class: 'inputs result_fill', attr: { readonly: 'readonly' } }
                ]
            ]
        ]
    ],

    // Ветка 2: Реальное создание сложного каскада (Section -> Select -> Options)
    [
        { tag: 'section', class: 'panel_controls' }, 
        [
            [
                { tag: 'select', id: 'mode-selector', class: 'dropdown' }, 
                [
                    { tag: 'option', value: 'sine', innerText: 'Режим Синус' },
                    { tag: 'option', value: 'noise', innerText: 'Режим Розовый Шум' }
                ]
            ]
        ]
    ]
];

--------------------------------------------------------------------------------
4. ЧИСТЫЙ СЕМАНТИЧЕСКИЙ БЛУПРИНТ (nestedBlueprint)
--------------------------------------------------------------------------------
Универсальный чертеж, преобразующий конфигурацию матрешки в чистый валидный HTML:


 * ====================================================================
 * МНЕМОНИЧЕСКАЯ СХЕМА ШАБЛОНИЗАТОРА (Родитель -> Дети -> Внуки)
 * ====================================================================
 * 
 * [ Структура объекта ]
 * Каждая ветка — это объект { свойства, children: [ массив_потомков ] }
 * 
 * 👑 РОДИТЕЛЬ (Главный контейнер, например, Секция или Стол)
 * └── 👶 ДЕТИ (Прямые потомки, например, Карточки игроков / Панели)
 *     └── 🥚 ВНУКИ (Глубокие элементы, например, Имена / Баланс / Кнопки)
 

 const DocumentationExample = [
    // 👑 РОДИТЕЛЬ: Открываем корневой элемент
    {
        tag: 'section#grandparent-id', // Тег и ID родителя
        class: 'grandparent-class',    // CSS-класс родителя
        
        // 👶 ДЕТИ: Массив, где живут прямые наследники
        children: [
            
            // --- ПЕРВЫЙ РЕБЕНОК ---
            {
                tag: 'div',
                class: 'parent-class',
                
                // 🥚 ВНУКИ: Этот ребенок сам становится родителем для своих детей
                children: [
                    { tag: 'span', innerText: 'Первый внук (Текст)' },
                    { tag: 'span', innerText: 'Второй внук (Баланс)' }
                ] // 🥚 Конец внуков первого ребенка
            }, // <-- Висячая запятая между детьми

            // --- ВТОРОЙ РЕБЕНОК ---
            {
                tag: 'div',
                class: 'parent-class',
                
                // 🥚 ВНУКИ: Вложенность для второго ребенка
                children: [
                    { tag: 'button', innerText: 'Третий внук (Кнопка)' }
                ] // 🥚 Конец внуков второго ребенка
            } // <-- Висячая запятая для Git (опционально)

        ] // 👶 Конец массива ДЕТЕЙ
    } // 👑 Конец РОДИТЕЛЯ
];


Запуск генерации интерфейса:
const appDOM = h('main#root', {}, factory(myFields, nestedBlueprint));
document.body.appendChild(appDOM);
================================================================================
*/

/**
 * Создает элемент с атрибутами, событиями и дочерними элементами.
 * @param {string} sel - Тег (например 'div' или 'select#dey.select')
 * @param {object} obj - Атрибуты и события
 * @param {Array|string} children - Дочерние элементы
 */

function h(sel, obj = {}, children = []) {
    // 1. Извлекаем тег (все что до первого # или .)
    const tag = sel.split(/[#.]/)[0] || 'div';
    const el = document.createElement(tag);
    // 2. Извлекаем ID (все что после # до следующей точки или конца)
    const idMatch = sel.match(/#([^.]+)/);
    if (idMatch) el.id = idMatch[1];
    // 3. Извлекаем КЛАССЫ (все что после точек, игнорируя то что после #)
    const classes = sel.split('.').slice(1); // Берем всё после первой точки
    if (classes.length > 0) {
        // Убираем возможный ID из хвоста первого класса, если он там затесался
        el.className = classes.map(c => c.split('#')[0]).join(' ');
    }
    for (const key in obj) {
        if (key.startsWith('on')) {
            el.addEventListener(key.slice(2).toLowerCase(), obj[key]);
        } else if (key === 'style' && typeof obj[key] === 'object') {
            Object.assign(el.style, obj[key]);
        } else if (key === 'attr') {
            for (const a in obj[key]) el.setAttribute(a, obj[key][a]);
        } else {
            el[key] = obj[key];
        }
    }
    // Улучшение: поддержка чисел в детях (например, результат расчета)
    if (typeof children === 'string' || typeof children === 'number') {
        el.innerHTML = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (child) el.append(child);
        });
    }
    return el;
}

const nestedBlueprint = (item) => {
    // Поддержка нового формата (объект) и старого формата (массив)
    const isArray = Array.isArray(item);
    const nodeData = isArray ? item[0] : item;

    // Дети могут быть либо во втором элементе массива, либо в ключе children объекта
    const childrenData = isArray ? item[1] : item.children;

    const tag = nodeData.tag || 'div';

    const props = {};
    for (const key in nodeData) {
        if (key === 'tag' || key === 'children') continue; // children и tag не идут в атрибуты

        if (key === 'hold') {
            props.placeholder = nodeData.hold;
        } else if (key === 'class') {
            props.className = nodeData.class;
        } else {
            props[key] = nodeData[key];
        }
    }

    const domChildren = [];
    if (childrenData && childrenData.length > 0) {
        domChildren.push(...factory(childrenData, nestedBlueprint));
    }

    return h(tag, props, domChildren);
};


/**
 * FACTORY: Превращает массив данных в массив DOM-узлов
 * @param {Array} data - Твой массив (например, speakerFields)
 * @param {Function} blueprint - Функция-чертеж, которая возвращает h()
 */

function factory(data, blueprint) {
    return data.filter(Boolean).map((item, index) => blueprint(item, index));
}

function clear(node = '') {
    // 1. Если node пустая, очищаем body
    if (node === '') { if (document.body) document.body.innerHTML = ''; return; }
    // 2. Ищем элемент
    const target = document.querySelector(node);
    // 3. Проверка на существование перед записью
    if (target) {
        target.innerHTML = '';
    } else { console.warn(`Элемент "${node}" не найден в DOM. Очистка отменена.`); }
}


 //end

