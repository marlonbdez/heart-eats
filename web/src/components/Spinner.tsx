import styles from './Spinner.module.css';

// Indicador de carga decorativo: hereda el color y el tamaño del texto. Quien
// lo usa anuncia el estado con su propio texto («Cargando…», «Enviando…»).
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
