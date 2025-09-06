// Script para verificar la estructura de errores con feedback_status
console.log("=== VERIFICACIÓN DE FEEDBACK_STATUS ===");

// Verificar si hay datos de errores disponibles
if (
  window.inboundScope &&
  window.inboundScope.dataService &&
  window.inboundScope.dataService.errors
) {
  const errors = window.inboundScope.dataService.errors;
  console.log(`Total de errores: ${errors.length}`);

  // Buscar errores que tengan feedback_status
  const withFeedbackStatus = errors.filter(
    (e) => e.feedback_status !== undefined
  );
  console.log(`Errores con feedback_status: ${withFeedbackStatus.length}`);

  if (withFeedbackStatus.length > 0) {
    console.log("Ejemplo de error con feedback_status:", withFeedbackStatus[0]);

    // Contar por feedback_status
    const feedbackStatusCounts = {};
    withFeedbackStatus.forEach((error) => {
      const status = error.feedback_status;
      feedbackStatusCounts[status] = (feedbackStatusCounts[status] || 0) + 1;
    });
    console.log("Conteo por feedback_status:", feedbackStatusCounts);
  } else {
    console.log("⚠️  Ningún error tiene la propiedad feedback_status");

    // Mostrar las propiedades disponibles en el primer error
    if (errors.length > 0) {
      console.log("Propiedades disponibles en el primer error:");
      console.log(Object.keys(errors[0]));
      console.log("Primer error completo:", errors[0]);
    }
  }

  // Buscar errores con feedback_date
  const withFeedbackDate = errors.filter(
    (e) => e.feedback_date && e.feedback_date !== ""
  );
  console.log(`Errores con feedback_date: ${withFeedbackDate.length}`);

  if (withFeedbackDate.length > 0) {
    console.log("Ejemplo con feedback_date:", withFeedbackDate[0]);
  }
} else {
  console.log(
    "No se encontraron datos de errores en window.inboundScope.dataService"
  );
}

console.log("=== FIN DE VERIFICACIÓN ===");
