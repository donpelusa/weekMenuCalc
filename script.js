// script.js

document.getElementById('uploadBtn').addEventListener('click', async () => {
    const files = document.getElementById('fileInput').files;

    // Validar que sean exactamente 7 archivos
    if (files.length !== 7) {
        alert("Debes agregar exactamente 7 archivos JSON, uno por cada día de la semana.");
        return;
    }

    // Nombres esperados de los archivos
    const expectedFiles = ["lunes.json","martes.json","miercoles.json","jueves.json","viernes.json","sabado.json","domingo.json"];
    const fileNames = Array.from(files).map(file => file.name.toLowerCase());
    const missingOrExtra = expectedFiles.some(day => !fileNames.includes(day)) || fileNames.some(fn => !expectedFiles.includes(fn));

    if (missingOrExtra) {
        alert("Debes agregar exactamente los archivos: lunes.json, martes.json, miercoles.json, jueves.json, viernes.json, sabado.json y domingo.json.");
        return;
    }

    // Leer todos los JSON y sumar las cantidades
    let totals = {};

    for (const file of files) {
        const text = await file.text();
        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            alert(`Error al parsear el archivo ${file.name}: ${e.message}`);
            return;
        }

        // Sumar al total
        for (const [alimento, gramaje] of Object.entries(jsonData)) {
            if (!totals[alimento]) {
                totals[alimento] = 0;
            }
            totals[alimento] += gramaje;
        }
    }

    // Cargar unidades.json
    let unidadesData;
    try {
        const res = await fetch('unidades.json');
        if (!res.ok) throw new Error("No se pudo cargar unidades.json");
        unidadesData = await res.json();
    } catch (e) {
        alert("Error al cargar unidades.json: " + e.message);
        return;
    }

    // Procesar tabla con unidades y precios
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = ""; // Limpiar antes de actualizar
    
    // Variables para los totales finales
    let totalGramaje = 0;
    let totalUnidades = 0;
    let totalPrecio = 0;

    for (const [alimento, gramaje] of Object.entries(totals)) {
        totalGramaje += gramaje;

        let unidades = 0;
        let precioCalculado = 0;

        if (unidadesData[alimento]) {
            const { unidad, precio } = unidadesData[alimento];
            const unitGrams = parseUnidad(unidad);
            const priceNumber = parsePrecio(precio);
            if (unitGrams > 0) {
                unidades = Math.ceil(gramaje / unitGrams);
                precioCalculado = unidades * priceNumber;
            }
        }

        totalUnidades += unidades;
        totalPrecio += precioCalculado;

        const tr = document.createElement("tr");

        const tdAlimento = document.createElement("td");
        tdAlimento.textContent = alimento;
        tr.appendChild(tdAlimento);

        const tdGramaje = document.createElement("td");
        tdGramaje.textContent = gramaje;
        tr.appendChild(tdGramaje);

        const tdUnidades = document.createElement("td");
        tdUnidades.textContent = unidades;
        tr.appendChild(tdUnidades);

        const tdPrecio = document.createElement("td");
        tdPrecio.textContent = precioCalculado;
        tr.appendChild(tdPrecio);

        const tdAccion = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", () => {
            editarFila(tr, unidadesData);
        });
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Eliminar";
        deleteBtn.addEventListener("click", () => {
            tr.remove();
            actualizarTotales();
        });

        tdAccion.appendChild(editBtn);
        tdAccion.appendChild(deleteBtn);
        tr.appendChild(tdAccion);

        tbody.appendChild(tr);
    }

    // Agregar la fila de totales al tfoot
    const tfoot = document.querySelector("#resultTable tfoot");
    tfoot.innerHTML = "";
    const trTotales = document.createElement("tr");

    const tdTotalesLabel = document.createElement("td");
    tdTotalesLabel.textContent = "Totales";
    trTotales.appendChild(tdTotalesLabel);

    const tdTotalGramaje = document.createElement("td");
    tdTotalGramaje.textContent = totalGramaje + " grs";
    trTotales.appendChild(tdTotalGramaje);

    const tdTotalUnidades = document.createElement("td");
    tdTotalUnidades.textContent = totalUnidades + " un";
    trTotales.appendChild(tdTotalUnidades);

    const tdTotalPrecio = document.createElement("td");
    tdTotalPrecio.textContent = "$ " + totalPrecio;
    trTotales.appendChild(tdTotalPrecio);

    const tdVacio = document.createElement("td");
    trTotales.appendChild(tdVacio);

    tfoot.appendChild(trTotales);

    // Función para actualizar los totales cuando se edite o elimine
    function actualizarTotales() {
        let sumGramaje = 0;
        let sumUnidades = 0;
        let sumPrecio = 0;

        const rows = tbody.querySelectorAll("tr");
        rows.forEach(row => {
            const gramaje = parseFloat(row.children[1].textContent) || 0;
            const unidades = parseFloat(row.children[2].textContent) || 0;
            const precio = parseFloat(row.children[3].textContent) || 0;

            sumGramaje += gramaje;
            sumUnidades += unidades;
            sumPrecio += precio;
        });

        const trTotales = tfoot.querySelector("tr");
        trTotales.children[1].textContent = sumGramaje;
        trTotales.children[2].textContent = sumUnidades;
        trTotales.children[3].textContent = sumPrecio;
    }
});

function parseUnidad(unidadStr) {
    // Ejemplos: "1 kg", "1.5 kg", "500 gr", "900 ml"
    // Extraer el número principal
    const parts = unidadStr.toLowerCase().split(" ");
    let cantidad = parseFloat(parts[0]);
    if (isNaN(cantidad)) cantidad = 1;

    const tipo = parts[1] || "gr";
    // 1 kg = 1000 gr, 1 gr = 1 gr, 1 ml = 1 gr
    if (tipo.includes("kg")) {
        return cantidad * 1000;
    } else if (tipo.includes("gr") || tipo.includes("g") || tipo.includes("ml")) {
        return cantidad; 
    }
    // Por defecto 1 si no se reconoce
    return 1;
}

function parsePrecio(precioStr) {
    // precio viene con formato "$2000" u "$11000"
    // Quitar el signo $ y convertir a número
    return parseFloat(precioStr.replace("$", "")) || 0;
}

function editarFila(row, unidadesData) {
    const alimentoCell = row.children[0];
    const gramajeCell = row.children[1];

    const alimentoActual = alimentoCell.textContent;
    const gramajeActual = gramajeCell.textContent;

    // Crear inputs
    const inputAlimento = document.createElement("input");
    inputAlimento.type = "text";
    inputAlimento.value = alimentoActual;

    const inputGramaje = document.createElement("input");
    inputGramaje.type = "number";
    inputGramaje.value = gramajeActual;

    // Reemplazar celdas
    alimentoCell.innerHTML = "";
    alimentoCell.appendChild(inputAlimento);

    gramajeCell.innerHTML = "";
    gramajeCell.appendChild(inputGramaje);

    // Cambiar los botones
    const accionCell = row.children[4];
    accionCell.innerHTML = "";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Guardar";
    saveBtn.addEventListener("click", () => {
        guardarFila(row, unidadesData, inputAlimento.value, inputGramaje.value);
    });

    accionCell.appendChild(saveBtn);
}

function guardarFila(row, unidadesData, nuevoAlimento, nuevoGramaje) {
    let gramaje = parseFloat(nuevoGramaje) || 0;
    let unidades = 0;
    let precioCalculado = 0;

    if (unidadesData[nuevoAlimento]) {
        const { unidad, precio } = unidadesData[nuevoAlimento];
        const unitGrams = parseUnidad(unidad);
        const priceNumber = parsePrecio(precio);
        if (unitGrams > 0) {
            unidades = Math.ceil(gramaje / unitGrams);
            precioCalculado = unidades * priceNumber;
        }
    }

    row.children[0].textContent = nuevoAlimento;
    row.children[1].textContent = gramaje;
    row.children[2].textContent = unidades;
    row.children[3].textContent = precioCalculado;

    const accionCell = row.children[4];
    accionCell.innerHTML = "";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => {
        editarFila(row, unidadesData);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Eliminar";
    deleteBtn.addEventListener("click", () => {
        row.remove();
        actualizarTotalesAlEditar();
    });

    accionCell.appendChild(editBtn);
    accionCell.appendChild(deleteBtn);

    actualizarTotalesAlEditar();
}

function actualizarTotalesAlEditar() {
    const tbody = document.querySelector("#resultTable tbody");
    const tfoot = document.querySelector("#resultTable tfoot");
    const rows = tbody.querySelectorAll("tr");

    let sumGramaje = 0;
    let sumUnidades = 0;
    let sumPrecio = 0;

    rows.forEach(row => {
        const gramaje = parseFloat(row.children[1].textContent) || 0;
        const unidades = parseFloat(row.children[2].textContent) || 0;
        const precio = parseFloat(row.children[3].textContent) || 0;

        sumGramaje += gramaje;
        sumUnidades += unidades;
        sumPrecio += precio;
    });

    const trTotales = tfoot.querySelector("tr");
    trTotales.children[1].textContent = sumGramaje;
    trTotales.children[2].textContent = sumUnidades;
    trTotales.children[3].textContent = sumPrecio;
}
