import { useAlerts } from "src/hooks/useAlerts";
import styles from "./Alerts.module.css";

const AlertContainer = () => {
  const { alerts } = useAlerts();

  return (
    <div id="alerts-container" className={styles.container}>
      {alerts.map((alert) => (
        <div key={alert.id} className={`${styles.alert} ${styles[alert.type]}`}>
          <p>{alert.title}:</p>
          <p>{alert.message}</p>
        </div>
      ))}
    </div>
  );
};

export default AlertContainer;
