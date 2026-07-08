import styles from "./SideMenu.module.css";

interface SideMenuProps {
  children: React.ReactNode;
}

const SideMenu = ({ children }: SideMenuProps) => {
  return (
    <menu className={styles.sideMenu}>
      {children}
    </menu>
  );
}

export default SideMenu;
