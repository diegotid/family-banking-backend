
var midScreen = 2;

function setup() {

    loadTable(true);
    document.addEventListener('scroll', handleScroll);
    var header = document.querySelector('#header');
    header.querySelector('#up').addEventListener('click', function() {
        var start = 0;
        var balance = document.querySelector('#balance');
        if (balance.classList.contains('oculto')) {
            start = document.querySelector('.descripcion').previousSibling.previousSibling.getBoundingClientRect().top;
        } else {
            start = balance.getBoundingClientRect().top;
        }
        start -= window.innerHeight / 100,
        window.scroll({top: start, behaviour: 'smooth'})
        header.classList.remove('active');
    });
    document.querySelector('#filtros button:last-of-type').addEventListener('click', function() {
        dismissFilter();
    });
    document.querySelector('#leyenda button:last-of-type').addEventListener('click', function() {
        dismissFilter();
    });
}

function hideFilter() {
    document.querySelector('#filtros').classList.remove('showing');
    document.querySelector('#oscuro').classList.remove('showing');
    document.querySelector('#header').classList.remove('active');
    document.body.classList.remove('freeze');
    document.body.removeEventListener('touchmove', freeze, { passive: false });
}

function dismissFilter() {
    sessionStorage.removeItem('filtros');
    var filtros = document.querySelector('#filtros');
    filtros.querySelector('#criterios').innerHTML = '';
    filtros.querySelectorAll('button').forEach(function(boton) {
        if (boton.id != 'dismiss') boton.remove();
    });
    var posiciones = document.querySelectorAll('.posicion');
    posiciones.forEach(function(posicion) {
        posicion.innerHTML = '';
    });
    document.querySelector('#balance').classList.remove('oculto');
    document.querySelector('#leyenda').classList.remove('showing');
    hideFilter();
    loadTable(true);
}

function loadTable(init) {
    var fecha = document.querySelector('#fecha');
    var header = document.querySelector('#header');
    var loading = document.querySelector('#loading');
    var balance = document.querySelector('#balance');
    var leyenda = document.querySelector('#leyenda');
    var tabla = document.querySelector('#movimientos');
    var campos = ['categoria', 'fecha', 'cuenta', 'importe', 'descripcion'];

    var criterios = JSON.parse(sessionStorage.getItem('filtros'));
    if (criterios) {
        balance.classList.add('oculto');
        leyenda.classList.add('showing');
    }

    if (init) tabla.innerHTML = '';

    if (init && !criterios) {
        balance.innerHTML = '';
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                var response = JSON.parse(request.responseText);
                response['cuentas'].forEach(function(item) {
                    if (item.balance) {
                        var celda = document.createElement('div');
                        celda.classList.add('cuenta');
                        celda.id = item.cuenta;
                        var img = document.createElement('img');
                        img.src = 'https://www.afterbanks.com/api/icons/' + item.logo + '.min.png';
                        celda.appendChild(img);
                        var nombre = document.createElement('div');
                        nombre.innerText = item.nombre;
                        celda.appendChild(nombre);
                        var importe = document.createElement('div');
                        importe.innerText = item.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                        celda.appendChild(importe);
                        celda.addEventListener('click', filtrarPorCuenta);
                        balance.appendChild(celda);
                    }
                });
            }
        };
        request.open('GET', 'api/cuentas/');
        request.send();
    }

    if (init && criterios) {
        var heading = leyenda.querySelector('.cuenta');
        if (heading) {
            var posiciones = document.querySelectorAll('.posicion');
            posiciones.forEach(function(posicion) {
                var pos = heading.cloneNode(true);
                pos.style.opacity = 0.15;
                posicion.innerHTML = '';
                posicion.appendChild(pos);
            });
        }
    }

    var requestm = new XMLHttpRequest();
    requestm.onreadystatechange = function() {
        if (requestm.readyState == 4 && requestm.status == 200) {
            var primero = true;
            var response = JSON.parse(requestm.responseText);
            response['movimientos'].forEach(function(item) {
                campos.forEach(function(campo) {
                    var celda = document.createElement('div');
                    celda.classList.add(campo);
                    celda.innerText = eval('item.' + campo);
                    if (campo == 'importe') {
                        celda.innerText = item.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                        if (item.importe > 0) {
                            celda.innerText = '+ ' + celda.innerText;
                            celda.classList.add('positive');
                        }
                        if (celda.innerText.indexOf('-') == 0) celda.innerText = celda.innerText.substring(1);
                    }
                    if (campo == 'cuenta') {
                        celda.id = item.cuenta.id;
                        celda.innerHTML = '<p>' + item.cuenta.nombre + '</p>';
                        if (item.cuenta.balance) {
                            celda.innerHTML += '<p>' + parseFloat(item.cuenta.balance).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + '</p>';
                        }
                        var logo = document.createElement('img');
                        logo.src = 'https://www.afterbanks.com/api/icons/' + item.banco + '.min.png'
                        celda.insertBefore(logo, celda.firstChild);
                        celda.addEventListener('click', filtrarPorCuenta);
                    }
                    tabla.appendChild(celda);
                    if (campo == 'descripcion') {
                        if (primero) {
                            primero = false;
                            celda.classList.add('focused');
                            var cuando = new Date(celda.previousSibling.previousSibling.previousSibling.innerText);
                            fecha.innerText = formatDate(cuando, true);            
                        }
                    }
                    celda.style.opacity = !init ? 0 :
                    (celda.getBoundingClientRect().top < (window.innerHeight / midScreen)) ?
                    celda.getBoundingClientRect().top / (window.innerHeight / midScreen) :
                    (2 * window.innerHeight / midScreen - celda.getBoundingClientRect().top) / (window.innerHeight / midScreen);
                })
            });
            loading.classList.remove('active');
            if (init) {
                var start = 0;
                var balance = document.querySelector('#balance');
                if (!balance || balance.classList.contains('oculto')) {
                    start = tabla.querySelector('.descripcion').previousSibling.previousSibling.getBoundingClientRect().top;
                } else {
                    start = balance.getBoundingClientRect().top;
                }
                start -= window.innerHeight / 100;
                window.scroll({top: start, behaviour: 'smooth'})
            }
        }
    }
    
	requestm.open('GET', 'api/movimientos/' + (init ? '' : tabla.childNodes.length / 5) + '?q=' + encodeURIComponent(JSON.stringify(criterios)));
    requestm.send();
}

function filtrarPorCuenta(e) {
    var cuenta = e.target;
    while (!cuenta.classList.contains('cuenta')) cuenta = cuenta.parentNode;
    var filtros = {'cuentas': cuenta.id};
    var sesion = sessionStorage.getItem('filtros');
    if (sesion) {
        filtros = JSON.parse(sesion);
        if (filtros.cuentas == cuenta.id) {
            return;
        }
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var filtros = document.querySelector('#filtros');
    var seleccion = cuenta.cloneNode(true);
    seleccion.style.opacity = 1;
    filtros.querySelector('#criterios').appendChild(seleccion);
    var button = document.createElement('button');
    button.innerText = 'Aplicar a la lista';
    filtros.insertBefore(button, filtros.querySelector('button:last-of-type'));
    filtros.querySelector('button:nth-of-type(1)').addEventListener('click', function() {
        loadTable(true);
        hideFilter();
    });
    filtros.classList.add('showing');
    leyenda.classList.remove('showing');
    var criterio = cuenta.cloneNode(true);
    criterio.style.opacity = 1;
    leyenda.querySelector('#criterios').innerHTML = '';
    leyenda.querySelector('#criterios').appendChild(criterio);
    document.querySelector('#oscuro').classList.add('showing');
    document.body.classList.add('freeze');
    document.body.addEventListener('touchmove', freeze, { passive: false });
}

var freeze = function(e) {
    console.log('Freeze....');
    e.preventDefault();
}

function handleScroll() {

    var tabla = document.querySelector('#movimientos');
    var balance = document.querySelector('#balance');
    var loading = document.querySelector('#loading');
    var header = document.querySelector('#header');
    var fecha = document.querySelector('#fecha');

    if (!balance
    || balance.classList.contains('oculto')
    || balance.getBoundingClientRect().bottom < 0) {
        header.classList.add('active');
    } else {
        header.classList.remove('active');
    }

    if (tabla.lastChild.getBoundingClientRect().bottom < window.innerHeight * 1.5) {
        if (!loading.classList.contains('active')) {
            loading.classList.add('active');
            loadTable(false);
        }
    }

    tabla.querySelectorAll('.descripcion').forEach(function(item) {
        if (item.getBoundingClientRect().top < window.innerHeight / (midScreen * 0.9)
        && item.getBoundingClientRect().top > window.innerHeight / (midScreen * 1.2)) {
            item.classList.add('focused');
            var cuando = new Date(item.previousSibling.previousSibling.previousSibling.innerText);
            fecha.innerText = formatDate(cuando, true);
            item.style.opacity =
            item.previousSibling.style.opacity =
            item.previousSibling.previousSibling.style.opacity = 1;
        } else {
            item.classList.remove('focused');
            item.style.opacity =
            item.previousSibling.style.opacity =
            item.previousSibling.previousSibling.style.opacity =
            item.getBoundingClientRect().top > window.innerHeight ? 0 :
            (item.getBoundingClientRect().top < (window.innerHeight / midScreen)
            || 2 * window.innerHeight / midScreen < item.getBoundingClientRect().top) ?
            item.getBoundingClientRect().top / (window.innerHeight / midScreen) :
            (2 * window.innerHeight / midScreen - item.getBoundingClientRect().top) / (window.innerHeight / midScreen);
        }
    })
}

function formatDate(date, onlyday) {
    var now = new Date();
    var ddd = new Date(date);
    ddd.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    var diff = Math.ceil(Math.abs(ddd.getTime() - now.getTime()) / (1000 * 3600 * 24));
    format = [];
    if (diff < 6) {
        if (diff > 1) {
            format['weekday'] = 'long';
        }
        if (onlyday != true) {
            format['hour'] = '2-digit';
            format['minute'] = '2-digit';
        }
    } else {
        format['day'] = 'numeric';
        format['month'] = 'long';
        if (diff > 180) format['year'] = 'numeric';
    }
    if (diff > 1) {
        var result = date.toLocaleDateString('es-ES', format);
    } else {
        var result = date.toLocaleTimeString('es-ES', format);        
    }
    if (onlyday === true) {
        if (diff == 0) result = 'hoy';
        if (diff == 1) result = 'ayer';
    } else {
        if (diff == 0) result = 'hoy a las ' + result;
        if (diff == 1) result = 'ayer a las ' + result;
    }
    return result;
}
