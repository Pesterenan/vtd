import { useLoading } from "src/hooks/useLoading";
import styles from "./LoadingOverlay.module.css";

const LoadingOverlay = () => {
  const { isLoading, message } = useLoading();

  if (!isLoading) return null;

  return (
    <div className={styles.loadingOverlay}>
      <p className={styles.loadingMessage}>{message}</p>
      <div className={styles.spinner} />
    </div>
  );
};

export default LoadingOverlay;
