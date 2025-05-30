{
  /* Información importante */
}
{
  showProgress && (
    <div className="update-info">
      <div className="info-icon">ℹ️</div>
      <div className="info-text">
        <strong>Proceso de actualización automática:</strong>
        <ol style={{ marginTop: "10px", paddingLeft: "20px" }}>
          <li>Se descargará la nueva versión</li>
          <li>Se ejecutará el actualizador independiente</li>
          <li>La aplicación se cerrará automáticamente</li>
          <li>El actualizador instalará la nueva versión</li>
          <li>
            Inbound Scope se reiniciará con la versión {updateInfo.version}
          </li>
        </ol>
        <p style={{ marginTop: "10px", fontSize: "0.9em", color: "#666" }}>
          <strong>Nota:</strong> El proceso es completamente automático. Por
          favor, no cierre la aplicación manualmente.
        </p>
      </div>
    </div>
  );
}
