import styles from "./SideMenu.module.css";

interface SideMenuProps {
  children: React.ReactNode;
}

const SideMenu = ({ children }: SideMenuProps) => {
  return (
    <menu className={styles.sideMenu}>
      <div className="container column ai-c jc-sb g-05">
        {children}
      </div>
    </menu>
  );
}

export default SideMenu;
