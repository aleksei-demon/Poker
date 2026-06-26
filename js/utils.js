// =============================================================================
//  UTILS.JS — Сервисные функции
// =============================================================================

//-------------------------S h o w   M e s s a g e-------------------------------------

function showMessage_(message = '', timeShow = 900) {

    let table = document.querySelector('.cards-table');
    if (!table) return;

    let p = document.createElement('p');
    p.classList.add('message');
    p.setAttribute('id', 'p_message');
    p.innerText = message;

    table.appendChild(p);

    let p_message = document.getElementById('p_message');
    let stepTransparent = 0;
    let down = false;

    let opacityInterval = setInterval(() => {
        if (!p_message) {
            clearInterval(opacityInterval);
            return;
        }
        if (stepTransparent < 100 && down == false) {
            p_message.style.opacity = (stepTransparent * 0.01);
            stepTransparent += 10;
            if (stepTransparent >= 99) { down = true; }
        }
        if (stepTransparent > 0 && down == true) {
            p_message.style.opacity = (stepTransparent * 0.01);
            stepTransparent--;
        }
    }, (timeShow / 200));

    setTimeout(() => {
        clearInterval(opacityInterval);
        if (p_message && p_message.parentNode === table) {
            table.removeChild(p_message);
        }
    }, timeShow);
}

//-------------------------Show message-------------------------------------

































