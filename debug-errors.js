// Script para depurar la estructura de los errores
console.log("=== DEPURACIÓN DE ERRORES ===");

// Verificar si hay datos de errores disponibles
if (
  window.inboundScope &&
  window.inboundScope.dataService &&
  window.inboundScope.dataService.errors
) {
  const errors = window.inboundScope.dataService.errors;
  console.log(`Total de errores: ${errors.length}`);

  // Mostrar los estados únicos que existen
  const uniqueStatuses = [...new Set(errors.map((e) => e.status))];
  console.log("Estados únicos encontrados:", uniqueStatuses);

  // Contar errores por cada estado
  const statusCounts = {};
  uniqueStatuses.forEach((status) => {
    statusCounts[status] = errors.filter((e) => e.status === status).length;
  });
  console.log("Conteo por estado:", statusCounts);

  // Mostrar ejemplos de cada tipo de estado
  uniqueStatuses.forEach((status) => {
    const example = errors.find((e) => e.status === status);
    console.log(`Ejemplo de error con estado "${status}":`, example);
  });

  // Verificar si hay algún error con estado "done"
  const doneErrors = errors.filter((e) => e.status === "done");
  console.log(`Errores con estado "done": ${doneErrors.length}`);

  // Verificar si hay algún error con estado "pending"
  const pendingErrors = errors.filter((e) => e.status === "pending");
  console.log(`Errores con estado "pending": ${pendingErrors.length}`);

  // Verificar si hay errores con otros estados
  const otherErrors = errors.filter(
    (e) => e.status !== "done" && e.status !== "pending"
  );
  console.log(`Errores con otros estados: ${otherErrors.length}`);
  if (otherErrors.length > 0) {
    console.log("Ejemplos de otros estados:", otherErrors.slice(0, 3));
  }
} else {
  console.log(
    "No se encontraron datos de errores en window.inboundScope.dataService"
  );
}

console.log("=== FIN DE DEPURACIÓN ===");
